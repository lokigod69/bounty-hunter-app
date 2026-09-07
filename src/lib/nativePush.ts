import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const db = supabase as SupabaseClient;
const installationKey = "bounty-push-installation";
export const PUSH_STATUS_EVENT = "bounty:push-status";
export const CONTENT_REFRESH_EVENT = "bounty:content-refresh";
export type PushStatus = "off" | "working" | "on" | "denied" | "error";
let status: PushStatus = "off";
let activeUser: string | null = null;
let generation = 0;
let activeBearer: string | null = null;
let suspended = false;
let nativeOperation: Promise<void> = Promise.resolve();
const nativeStep = (version: number, operation: () => Promise<void>) => {
  nativeOperation = nativeOperation
    .catch(() => {})
    .then(async () => {
      if (version === generation) await operation();
    });
  return nativeOperation;
};
let listeners: Promise<void> | null = null;
let registration: Promise<void> = Promise.resolve();
let onTap: (data: unknown) => void = () => {};
let registerTimer: ReturnType<typeof setTimeout> | undefined;
export const getPushStatus = () => status;
export const nativePushAvailable = () =>
  Capacitor.getPlatform() === "ios" &&
  import.meta.env.VITE_PUSH_ENABLED === "true";
const setStatus = (value: PushStatus) => {
  status = value;
  window.dispatchEvent(new Event(PUSH_STATUS_EVENT));
};
const installation = () => {
  let id = localStorage.getItem(installationKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(installationKey, id);
  }
  return id;
};
async function installListeners() {
  if (listeners) return listeners;
  listeners = (async () => {
    await PushNotifications.addListener("registration", ({ value }) => {
      clearTimeout(registerTimer);
      const uid = activeUser,
        version = generation;
      if (!uid || suspended) return;
      registration = registration
        .catch(() => {})
        .then(async () => {
          if (version !== generation || suspended) return;
          const { data } = await supabase.auth.getSession();
          if (
            data.session?.user.id !== uid ||
            version !== generation ||
            suspended
          )
            return;
          activeBearer = data.session.access_token;
          const { error } = await db
            .rpc("register_push_device", {
              p_installation: installation(),
              p_token: value,
              p_environment: import.meta.env.VITE_APNS_ENVIRONMENT,
            })
            .setHeader("Authorization", `Bearer ${data.session.access_token}`)
            .abortSignal(AbortSignal.timeout(8000));
          if (version === generation) setStatus(error ? "error" : "on");
        })
        .catch(() => {
          if (version === generation) setStatus("error");
        });
    });
    await PushNotifications.addListener("registrationError", () => {
      clearTimeout(registerTimer);
      if (activeUser) setStatus("error");
    });
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      ({ notification }) => onTap(notification.data),
    );
    await PushNotifications.addListener("pushNotificationReceived", () =>
      window.dispatchEvent(new Event(CONTENT_REFRESH_EVENT)),
    );
  })();
  return listeners;
}
async function register(prompt: boolean) {
  if (!nativePushAvailable() || !activeUser || suspended) return;
  const version = generation;
  try {
    await installListeners();
    let permission = await PushNotifications.checkPermissions();
    if (prompt && permission.receive === "prompt")
      permission = await PushNotifications.requestPermissions();
    if (version !== generation) return;
    if (permission.receive !== "granted") {
      setStatus(permission.receive === "denied" ? "denied" : "off");
      return;
    }
    setStatus("working");
    clearTimeout(registerTimer);
    registerTimer = setTimeout(() => {
      if (version === generation) setStatus("error");
    }, 12000);
    await nativeStep(version, () => PushNotifications.register());
  } catch {
    if (version === generation) setStatus("error");
  }
}
// Capture the old session's bearer token so a delayed revoke can never operate
// as a newly signed-in user. It stays in memory and is never logged or persisted.
async function revoke(installationId: string | null, bearer: string | null) {
  if (!installationId || !bearer) return;
  const { error } = await db
    .rpc("revoke_push_device", { p_installation: installationId })
    .setHeader("Authorization", `Bearer ${bearer}`)
    .abortSignal(AbortSignal.timeout(8000));
  if (error)
    throw new Error("Notification settings could not be saved. Try again.");
}
export async function startPushSession(
  userId: string | null,
  tap: (data: unknown) => void,
  bearer?: string,
) {
  if (!nativePushAvailable()) return;
  onTap = tap;
  const oldUser = activeUser,
    oldBearer = activeBearer;
  const changed = oldUser !== userId;
  if (changed) {
    generation++;
    activeUser = userId;
    activeBearer = null;
    setStatus("off");
  }
  const version = generation;
  suspended = false;
  if (userId && bearer) activeBearer = bearer;
  await installListeners();
  if (changed && oldUser) {
    await nativeStep(version, async () => {
      await Promise.allSettled([
        PushNotifications.unregister(),
        PushNotifications.removeAllDeliveredNotifications(),
      ]);
    });
    await registration;
    await revoke(localStorage.getItem(installationKey), oldBearer);
  }
  if (version !== generation) return;
  if (userId && !activeBearer) {
    const { data } = await supabase.auth.getSession();
    if (version !== generation || data.session?.user.id !== userId) return;
    activeBearer = data.session.access_token;
  }
  if (
    userId &&
    localStorage.getItem(`bounty-push-enabled:${userId}`) !== "false"
  )
    await register(false);
}
export const enableNativePush = () => {
  suspended = false;
  if (activeUser)
    localStorage.setItem(`bounty-push-enabled:${activeUser}`, "true");
  return register(true);
};
export async function disableNativePush() {
  if (activeUser)
    localStorage.setItem(`bounty-push-enabled:${activeUser}`, "false");
  await stopNativePush();
}
export async function stopNativePush() {
  if (!nativePushAvailable()) return;
  const bearer = activeBearer,
    id = localStorage.getItem(installationKey);
  const version = ++generation;
  suspended = true;
  clearTimeout(registerTimer);
  try {
    await nativeStep(version, async () => {
      await Promise.allSettled([
        PushNotifications.unregister(),
        PushNotifications.removeAllDeliveredNotifications(),
      ]);
    });
    await registration;
    await revoke(id, bearer);
    if (version === generation) setStatus("off");
  } catch (error) {
    if (version === generation) setStatus("error");
    throw error;
  }
}
export async function clearNativeNotifications() {
  if (Capacitor.getPlatform() !== "ios") return;
  const version = ++generation;
  activeUser = null;
  activeBearer = null;
  suspended = true;
  clearTimeout(registerTimer);
  await nativeStep(version, async () => {
    await Promise.allSettled([
      PushNotifications.unregister(),
      PushNotifications.removeAllDeliveredNotifications(),
    ]);
  });
}
