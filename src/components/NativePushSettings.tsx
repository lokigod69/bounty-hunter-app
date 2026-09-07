import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppButton } from "./ui/AppButton";
import {
  disableNativePush,
  enableNativePush,
  getPushStatus,
  nativePushAvailable,
  PUSH_STATUS_EVENT,
} from "../lib/nativePush";

export function NativePushSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(getPushStatus);
  useEffect(() => {
    const update = () => setStatus(getPushStatus());
    window.addEventListener(PUSH_STATUS_EVENT, update);
    return () => window.removeEventListener(PUSH_STATUS_EVENT, update);
  }, []);
  if (!nativePushAvailable()) return null;
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
      <p className="text-sm font-medium flex gap-2 items-center">
        <Bell size={18} />
        {t("push.title")}
      </p>
      <p className="text-xs text-white/70" role="status">
        {t(`push.${status}`)}
      </p>
      {status !== "on" && status !== "denied" && (
        <AppButton
          type="button"
          loading={status === "working"}
          onClick={enableNativePush}
        >
          {t("push.enable")}
        </AppButton>
      )}
      {status === "on" && (
        <AppButton
          type="button"
          variant="ghost"
          onClick={() => void disableNativePush().catch(() => {})}
        >
          {t("push.disable")}
        </AppButton>
      )}
    </div>
  );
}
