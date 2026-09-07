// @vitest-environment happy-dom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  platform: "ios",
  user: "alice",
  permission: "granted",
  events: new Map<string, (v: unknown) => void>(),
  addListener: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  removeAllDeliveredNotifications: vi.fn(),
  requestPermissions: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => mock.platform },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    ...mock,
    checkPermissions: async () => ({ receive: mock.permission }),
  },
}));
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: mock.user },
            access_token: `token-${mock.user}`,
          },
        },
      }),
    },
    rpc: mock.rpc,
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  mock.events.clear();
  mock.platform = "ios";
  mock.user = "alice";
  mock.permission = "granted";
  vi.stubEnv("VITE_PUSH_ENABLED", "true");
  vi.stubEnv("VITE_APNS_ENVIRONMENT", "production");
  mock.addListener.mockImplementation(
    async (name: string, callback: (v: unknown) => void) => {
      mock.events.set(name, callback);
      return { remove: vi.fn() };
    },
  );
  mock.register.mockResolvedValue(undefined);
  mock.unregister.mockResolvedValue(undefined);
  mock.removeAllDeliveredNotifications.mockResolvedValue(undefined);
  mock.requestPermissions.mockResolvedValue({ receive: "granted" });
  mock.rpc.mockReturnValue({
    setHeader: () => ({ abortSignal: () => Promise.resolve({ error: null }) }),
  });
});
afterEach(async () => {
  const module = await import("./nativePush");
  await module.clearNativeNotifications();
  vi.unstubAllEnvs();
});
const token = () =>
  mock.events.get("registration")?.({ value: "a".repeat(64) });
it("does not initialize a browser or disabled release", async () => {
  mock.platform = "web";
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  await push.enableNativePush();
  expect(mock.addListener).not.toHaveBeenCalled();
  expect(mock.requestPermissions).not.toHaveBeenCalled();
});
it("installs listeners before registering and keeps the tap handler", async () => {
  const push = await import("./nativePush");
  const tap = vi.fn();
  mock.register.mockImplementation(async () => {
    expect(mock.events.has("registration")).toBe(true);
    expect(mock.events.has("pushNotificationActionPerformed")).toBe(true);
  });
  await push.startPushSession("alice", tap);
  await push.enableNativePush();
  mock.events.get("pushNotificationActionPerformed")?.({
    notification: { data: { kind: "mission_assigned" } },
  });
  expect(tap).toHaveBeenCalledWith({ kind: "mission_assigned" });
});
it("only asks for permission after the explicit enable action", async () => {
  mock.permission = "prompt";
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  expect(mock.requestPermissions).not.toHaveBeenCalled();
  expect(mock.register).not.toHaveBeenCalled();
  await push.enableNativePush();
  expect(mock.requestPermissions).toHaveBeenCalledOnce();
  expect(mock.register).toHaveBeenCalledOnce();
});
it("does not register a token against an unexpected current account", async () => {
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  mock.user = "bob";
  token();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("waits for an in-flight registration before revoking for sign-out", async () => {
  let complete: (v: { error: null }) => void = () => {};
  const waiting = new Promise<{ error: null }>((resolve) => {
    complete = resolve;
  });
  mock.rpc.mockImplementation((name: string) => ({
    setHeader: () => ({
      abortSignal: () =>
        name === "register_push_device"
          ? waiting
          : Promise.resolve({ error: null }),
    }),
  }));
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  token();
  await vi.waitFor(() => expect(mock.rpc).toHaveBeenCalledOnce());
  const stopping = push.stopNativePush();
  await Promise.resolve();
  expect(mock.rpc).toHaveBeenCalledOnce();
  complete({ error: null });
  await stopping;
  expect(mock.rpc.mock.calls.map((call) => call[0])).toEqual([
    "register_push_device",
    "revoke_push_device",
  ]);
  expect(mock.unregister).toHaveBeenCalled();
  expect(push.getPushStatus()).toBe("off");
});
it("keeps an explicit device opt-out across session refreshes", async () => {
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  token();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await push.disableNativePush();
  mock.register.mockClear();
  await push.startPushSession("alice", () => {});
  expect(mock.register).not.toHaveBeenCalled();
  await push.enableNativePush();
  expect(mock.register).toHaveBeenCalledOnce();
});
it("keeps revoke failure visible instead of pretending sign-out is complete", async () => {
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  token();
  await new Promise((resolve) => setTimeout(resolve, 0));
  mock.rpc.mockReturnValue({
    setHeader: () => ({
      abortSignal: () => Promise.resolve({ error: { message: "offline" } }),
    }),
  });
  await expect(push.stopNativePush()).rejects.toThrow();
  expect(push.getPushStatus()).toBe("error");
});
it("a delayed Alice opt-out never unregisters or restores Alice over Bob", async () => {
  let complete: (v: { error: null }) => void = () => {};
  const held = new Promise<{ error: null }>((resolve) => {
    complete = resolve;
  });
  let firstRevoke = true;
  const headers: string[] = [];
  mock.rpc.mockImplementation((name: string) => ({
    setHeader: (_key: string, bearer: string) => {
      headers.push(bearer);
      return {
        abortSignal: () => {
          if (name === "revoke_push_device" && firstRevoke) {
            firstRevoke = false;
            return held;
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  }));
  const push = await import("./nativePush");
  await push.startPushSession("alice", () => {});
  token();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stopping = push.disableNativePush();
  await vi.waitFor(() => expect(firstRevoke).toBe(false));
  mock.user = "bob";
  await push.startPushSession("bob", () => {});
  token();
  await new Promise((resolve) => setTimeout(resolve, 0));
  mock.unregister.mockClear();
  complete({ error: null });
  await stopping;
  expect(mock.unregister).not.toHaveBeenCalled();
  expect(push.getPushStatus()).toBe("on");
  await push.enableNativePush();
  expect(localStorage.getItem("bounty-push-enabled:bob")).toBe("true");
  expect(localStorage.getItem("bounty-push-enabled:alice")).toBe("false");
  expect(headers).toEqual([
    "Bearer token-alice",
    "Bearer token-alice",
    "Bearer token-alice",
    "Bearer token-bob",
  ]);
});
