import type { JSX } from "react";
import { useT } from "../../i18n";

interface MacosSetupWizardProps {
  acknowledged: boolean;
  showAdvanced: boolean;
  onRunBasic: () => void;
  onRunAdvanced: () => void;
  onShowAdvanced: () => void;
  onReset: () => void;
  onClose: () => void;
}

const BASIC_COMMAND = "killall ptpcamerad icdd";
const ADVANCED_COMMAND =
  "launchctl disable gui/$(id -u)/com.apple.ptpcamerad && launchctl disable gui/$(id -u)/com.apple.icdd && killall ptpcamerad icdd";
const ENABLE_COMMAND =
  "launchctl enable gui/$(id -u)/com.apple.ptpcamerad && launchctl enable gui/$(id -u)/com.apple.icdd";

export function MacosSetupWizard({
  acknowledged,
  showAdvanced,
  onRunBasic,
  onRunAdvanced,
  onShowAdvanced,
  onReset,
  onClose,
}: MacosSetupWizardProps): JSX.Element {
  const t = useT();

  if (acknowledged) {
    return (
      <div role="dialog" aria-modal="true" className="max-w-sm rounded-sm border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-100">
        <p className="font-medium">{t("camera.macos.done.title")}</p>
        <code className="mt-2 block rounded-sm bg-zinc-950 p-2 text-[11px] text-zinc-200">
          {ENABLE_COMMAND}
        </code>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onReset} className="rounded-sm border border-zinc-600 px-2 py-1 text-xs">
            {t("camera.macos.reset")}
          </button>
          <button type="button" onClick={onClose} className="rounded-sm border border-zinc-600 px-2 py-1 text-xs">
            {t("camera.macos.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" className="max-w-sm rounded-sm border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100">
      <p className="font-medium">{t("camera.macos.setup.title")}</p>
      <p className="mt-1 text-xs text-zinc-400">{t("camera.macos.basic.body")}</p>
      <code className="mt-2 block rounded-sm bg-black p-2 text-[11px] text-zinc-200">
        {BASIC_COMMAND}
      </code>
      <button type="button" onClick={onRunBasic} className="mt-2 rounded-sm border border-zinc-600 px-2 py-1 text-xs">
        {t("camera.macos.ran")}
      </button>
      {!showAdvanced ? (
        <button type="button" onClick={onShowAdvanced} className="ml-2 text-xs text-zinc-400 underline">
          {t("camera.macos.showAdvanced")}
        </button>
      ) : null}
      {showAdvanced ? (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <p className="text-xs font-medium text-amber-200">{t("camera.macos.advanced.title")}</p>
          <code className="mt-2 block rounded-sm bg-black p-2 text-[11px] text-zinc-200">
            {ADVANCED_COMMAND}
          </code>
          <p className="mt-2 text-[11px] text-zinc-400">{t("camera.macos.advanced.enable")}</p>
          <code className="mt-1 block rounded-sm bg-black p-2 text-[11px] text-zinc-200">
            {ENABLE_COMMAND}
          </code>
          <button type="button" onClick={onRunAdvanced} className="mt-2 rounded-sm border border-amber-500/50 px-2 py-1 text-xs text-amber-100">
            {t("camera.macos.ran")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
