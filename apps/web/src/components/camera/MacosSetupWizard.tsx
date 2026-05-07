import type { JSX } from "react";
import { createPortal } from "react-dom";
import { useT } from "../../i18n";
import { MacosServicesControl } from "./MacosServicesControl";

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
  "launchctl disable gui/$(id -u)/com.apple.ptpcamerad && launchctl disable gui/$(id -u)/com.apple.icdd && killall -STOP ptpcamerad icdd";
const ENABLE_COMMAND =
  "killall -CONT ptpcamerad icdd; launchctl enable gui/$(id -u)/com.apple.ptpcamerad && launchctl enable gui/$(id -u)/com.apple.icdd";

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
  if (typeof document === "undefined") return <></>;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="macos-setup-title"
        className="pointer-events-auto fixed bottom-4 right-4 top-24 flex w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-sm border border-zinc-700/90 bg-zinc-950/95 text-sm text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur sm:bottom-auto sm:max-h-[calc(100vh-7rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
          <div>
            <p id="macos-setup-title" className="font-medium">
              {acknowledged ? t("camera.macos.done.title") : t("camera.macos.setup.title")}
            </p>
            {!acknowledged ? (
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t("camera.macos.basic.body")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-sm border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
          >
            {t("camera.macos.close")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {acknowledged ? (
            <ConfirmedStep onReset={onReset} />
          ) : (
            <ReleaseStep
              showAdvanced={showAdvanced}
              onRunBasic={onRunBasic}
              onRunAdvanced={onRunAdvanced}
              onShowAdvanced={onShowAdvanced}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmedStep({ onReset }: { onReset: () => void }): JSX.Element {
  const t = useT();
  return (
    <div className="text-emerald-100">
      <CommandBlock tone="success" command={ENABLE_COMMAND} />
      <MacosServicesControl forceVisible />
      <button
        type="button"
        onClick={onReset}
        className="mt-3 rounded-sm border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
      >
        {t("camera.macos.reset")}
      </button>
    </div>
  );
}

function ReleaseStep({
  showAdvanced,
  onRunBasic,
  onRunAdvanced,
  onShowAdvanced,
}: {
  showAdvanced: boolean;
  onRunBasic: () => void;
  onRunAdvanced: () => void;
  onShowAdvanced: () => void;
}): JSX.Element {
  const t = useT();
  return (
    <>
      <CommandBlock command={BASIC_COMMAND} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRunBasic}
          className="rounded-sm border border-zinc-600 px-2 py-1 text-xs text-zinc-100 hover:border-zinc-400"
        >
          {t("camera.macos.ran")}
        </button>
        {!showAdvanced ? (
          <button
            type="button"
            onClick={onShowAdvanced}
            className="rounded-sm border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            {t("camera.macos.showAdvanced")}
          </button>
        ) : null}
      </div>
      {showAdvanced ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-xs font-medium text-amber-200">{t("camera.macos.advanced.title")}</p>
          <CommandBlock tone="warning" command={ADVANCED_COMMAND} />
          <p className="mt-3 text-[11px] text-zinc-400">{t("camera.macos.advanced.enable")}</p>
          <CommandBlock command={ENABLE_COMMAND} />
          <MacosServicesControl forceVisible />
          <button
            type="button"
            onClick={onRunAdvanced}
            className="mt-3 rounded-sm border border-amber-500/50 px-2 py-1 text-xs text-amber-100 hover:border-amber-400"
          >
            {t("camera.macos.ran")}
          </button>
        </div>
      ) : null}
    </>
  );
}

function CommandBlock({
  command,
  tone = "default",
}: {
  command: string;
  tone?: "default" | "success" | "warning";
}): JSX.Element {
  const border =
    tone === "success"
      ? "border-emerald-500/20"
      : tone === "warning"
        ? "border-amber-500/20"
        : "border-zinc-800";
  return (
    <code
      className={`mt-2 block overflow-x-auto whitespace-pre-wrap rounded-sm border ${border} bg-black/80 p-2 font-mono text-[11px] leading-relaxed text-zinc-200`}
    >
      {command}
    </code>
  );
}
