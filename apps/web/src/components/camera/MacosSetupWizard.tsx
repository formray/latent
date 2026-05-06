import { useEffect, useState, type JSX } from "react";
import { useT } from "../../i18n";
import {
  canUseMacosCameraHelper,
  getMacosCameraHelperStatus,
  releaseMacosCameraServices,
  restoreMacosCameraServices,
  type MacosCameraHelperStatus,
} from "../../lib/macos-camera-helper";

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
  const [helperStatus, setHelperStatus] = useState<MacosCameraHelperStatus | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [helperBusy, setHelperBusy] = useState(false);

  useEffect(() => {
    if (!canUseMacosCameraHelper()) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 800);
    getMacosCameraHelperStatus(abort.signal)
      .then((status) => {
        setHelperStatus(status);
        setHelperError(null);
      })
      .catch(() => {
        setHelperStatus(null);
        setHelperError(t("camera.macos.helper.offline"));
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      abort.abort();
      clearTimeout(timeout);
    };
  }, [t]);

  const runHelperAction = async (
    action: () => Promise<MacosCameraHelperStatus>,
  ): Promise<void> => {
    setHelperBusy(true);
    try {
      setHelperStatus(await action());
      setHelperError(null);
    } catch (err) {
      setHelperError(err instanceof Error ? err.message : String(err));
    } finally {
      setHelperBusy(false);
    }
  };

  if (acknowledged) {
    return (
      <div role="dialog" aria-modal="true" className="max-w-sm rounded-sm border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-100">
        <p className="font-medium">{t("camera.macos.done.title")}</p>
        <code className="mt-2 block rounded-sm bg-zinc-950 p-2 text-[11px] text-zinc-200">
          {ENABLE_COMMAND}
        </code>
        <MacosHelperPanel
          status={helperStatus}
          error={helperError}
          busy={helperBusy}
          onRefresh={() => void runHelperAction(getMacosCameraHelperStatus)}
          onRelease={() => void runHelperAction(releaseMacosCameraServices)}
          onRestore={() => void runHelperAction(restoreMacosCameraServices)}
        />
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
          <MacosHelperPanel
            status={helperStatus}
            error={helperError}
            busy={helperBusy}
            onRefresh={() => void runHelperAction(getMacosCameraHelperStatus)}
            onRelease={() => void runHelperAction(releaseMacosCameraServices)}
            onRestore={() => void runHelperAction(restoreMacosCameraServices)}
          />
          <button type="button" onClick={onRunAdvanced} className="mt-2 rounded-sm border border-amber-500/50 px-2 py-1 text-xs text-amber-100">
            {t("camera.macos.ran")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MacosHelperPanel({
  status,
  error,
  busy,
  onRefresh,
  onRelease,
  onRestore,
}: {
  status: MacosCameraHelperStatus | null;
  error: string | null;
  busy: boolean;
  onRefresh: () => void;
  onRelease: () => void;
  onRestore: () => void;
}): JSX.Element | null {
  const t = useT();
  if (!canUseMacosCameraHelper() || (!status && !error)) return null;
  const serviceSummary = status
    ? `ptpcamerad ${formatService(status.services.ptpcamerad)} · icdd ${formatService(status.services.icdd)}`
    : error;
  return (
    <div className="mt-3 rounded-sm border border-zinc-800 bg-zinc-950/80 p-2 text-[11px] text-zinc-300">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-200">{t("camera.macos.helper.title")}</span>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="rounded-sm border border-zinc-700 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {t("camera.macos.helper.refresh")}
        </button>
      </div>
      <p className="mt-1 break-words text-zinc-500">{serviceSummary}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onRelease}
          className="rounded-sm border border-amber-500/50 px-2 py-1 text-[11px] text-amber-100 disabled:opacity-50"
        >
          {t("camera.macos.helper.release")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onRestore}
          className="rounded-sm border border-zinc-700 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {t("camera.macos.helper.restore")}
        </button>
      </div>
    </div>
  );
}

function formatService(service: {
  disabled: boolean;
  suspendedPids: number[];
  runningPids: number[];
}): string {
  const launchState = service.disabled ? "disabled" : "enabled";
  if (service.runningPids.length > 0) {
    return `${launchState}, running ${service.runningPids.join(",")}`;
  }
  if (service.suspendedPids.length > 0) {
    return `${launchState}, suspended ${service.suspendedPids.join(",")}`;
  }
  return `${launchState}, stopped`;
}
