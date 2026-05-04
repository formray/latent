import type { JSX } from "react";
import { useT } from "../../i18n";

interface MacosBetaWarningProps {
  onAcknowledge: () => void;
}

export function MacosBetaWarning({
  onAcknowledge,
}: MacosBetaWarningProps): JSX.Element {
  const t = useT();
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="max-w-sm rounded-sm border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-100"
    >
      <p className="font-medium">{t("camera.macos.beta.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
        {t("camera.macos.beta.body")}
      </p>
      <button
        type="button"
        onClick={onAcknowledge}
        className="mt-2 rounded-sm border border-amber-300/50 px-2 py-1 text-xs text-amber-50"
      >
        {t("camera.macos.beta.ack")}
      </button>
    </div>
  );
}
