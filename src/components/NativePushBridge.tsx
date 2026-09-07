import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  startPushSession,
  clearNativeNotifications,
  CONTENT_REFRESH_EVENT,
} from "../lib/nativePush";
import { pushDestination } from "../lib/pushNavigation";
import { supabase } from "../lib/supabase";

export function NativePushBridge() {
  const { user, session, authLoading } = useAuth();
  const userId = user?.id;
  const bearer = session?.access_token;
  const navigate = useNavigate();
  const pending = useRef<unknown>(null);
  const current = useRef({ userId: user?.id, authLoading });
  current.current = { userId: user?.id, authLoading };
  useEffect(() => {
    if (Capacitor.getPlatform() !== "ios") return;
    const refresh = () => {
      window.dispatchEvent(new Event(CONTENT_REFRESH_EVENT));
      window.dispatchEvent(new Event("bounty:friendships-changed"));
    };
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) refresh();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
  useEffect(() => {
    const tap = async (data: unknown) => {
      const identity = current.current;
      if (identity.authLoading || !identity.userId) {
        pending.current = data;
        return;
      }
      let path = pushDestination(data, identity.userId);
      pending.current = null;
      if (path?.includes("?mission=")) {
        const resource = new URLSearchParams(path.split("?")[1]).get("mission");
        const { data: mission, error } = await supabase
          .from("tasks")
          .select("id,is_archived,created_by,assigned_to")
          .eq("id", resource!)
          .maybeSingle();
        if (error || !mission || current.current.userId !== identity.userId)
          return;
        path = `${mission.is_archived ? "/archive" : mission.created_by === identity.userId ? "/issued" : "/"}?mission=${mission.id}`;
      }
      if (path) {
        navigate(path);
        window.dispatchEvent(new Event(CONTENT_REFRESH_EVENT));
      }
    };
    if (!authLoading && !userId) void clearNativeNotifications();
    void startPushSession(
      authLoading ? null : (userId ?? null),
      (data) => {
        void tap(data).catch(() => {});
      },
      bearer,
    ).catch(() => {});
    if (!authLoading && userId && pending.current)
      void tap(pending.current).catch(() => {});
  }, [userId, authLoading, navigate, bearer]);
  return null;
}
