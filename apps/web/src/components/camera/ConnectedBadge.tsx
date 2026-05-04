import type { JSX } from "react";
import { useT } from "../../i18n";

interface ConnectedBadgeProps {
  cameraModel: string;
  firmwareVersion: string;
  onDisconnect: () => void;
}

export function ConnectedBadge({
  cameraModel,
  firmwareVersion,
  onDisconnect,
}: ConnectedBadgeProps): JSX.Element {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <span
        data-testid="camera-status"
        className="font-mono text-[10px] uppercase tracking-wider text-emerald-400"
      >
        {cameraModel} · {firmwareVersion}
      </span>
      <button
        type="button"
        onClick={onDisconnect}
        className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition-colors hover:border-emerald-500/60"
      >
        {t("camera.disconnect")}
      </button>
    </div>
  );
}
