import { useEffect, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { useT } from "../../i18n";
import {
  canUseMacosCameraHelper,
  getMacosCameraHelperStatus,
  macosCameraHelperNeedsRestore,
  releaseMacosCameraServices,
  restoreMacosCameraServices,
  type MacosCameraHelperStatus,
} from "../../lib/macos-camera-helper";

interface MacosServicesControlProps {
  variant?: "compact" | "panel";
  forceVisible?: boolean;
}

export function MacosServicesControl({
  variant = "panel",
  forceVisible = false,
}: MacosServicesControlProps): JSX.Element | null {
  const t = useT();
  const [helperStatus, setHelperStatus] = useState<MacosCameraHelperStatus | null>(null);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [helperBusy, setHelperBusy] = useState(false);

  useEffect(() => {
    if (!canUseMacosCameraHelper()) return;
    void refresh();
    const interval = setInterval(() => {
      void refresh({ quiet: true });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async ({ quiet = false }: { quiet?: boolean } = {}): Promise<void> => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 800);
    try {
      const status = await getMacosCameraHelperStatus(abort.signal);
      setHelperStatus(status);
      setHelperError(null);
    } catch {
      setHelperStatus(null);
      if (!quiet) setHelperError(t("camera.macos.helper.offline"));
    } finally {
      clearTimeout(timeout);
    }
  };

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

  if (!canUseMacosCameraHelper()) return null;
  const needsRestore = helperStatus ? macosCameraHelperNeedsRestore(helperStatus) : false;
  if (!forceVisible && !needsRestore) return null;
  if (!forceVisible && !helperStatus && !helperError) return null;

  if (variant === "compact") {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-sm border border-amber-500/40 bg-zinc-950/95 px-3 py-2 text-[11px] text-zinc-300 shadow-xl shadow-black/40 backdrop-blur"
      >
        <span className="font-medium text-amber-100">{t("camera.macos.helper.paused")}</span>
        <button
          type="button"
          disabled={helperBusy}
          onClick={() => void runHelperAction(restoreMacosCameraServices)}
          className="rounded-sm border border-emerald-500/50 px-2 py-1 text-[11px] text-emerald-100 disabled:opacity-50"
        >
          {t("camera.macos.helper.restore")}
        </button>
        <button
          type="button"
          disabled={helperBusy}
          onClick={() => void refresh()}
          className="rounded-sm border border-zinc-700 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {t("camera.macos.helper.refresh")}
        </button>
      </div>,
      document.body,
    );
  }

  return (
    <div className="mt-3 rounded-sm border border-zinc-800 bg-zinc-950/80 p-2 text-[11px] text-zinc-300">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-200">{t("camera.macos.helper.title")}</span>
        <button
          type="button"
          disabled={helperBusy}
          onClick={() => void refresh()}
          className="rounded-sm border border-zinc-700 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {t("camera.macos.helper.refresh")}
        </button>
      </div>
      <p className="mt-1 break-words text-zinc-500">
        {helperStatus
          ? `ptpcamerad ${formatService(helperStatus.services.ptpcamerad)} · icdd ${formatService(
              helperStatus.services.icdd,
            )}`
          : helperError}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={helperBusy}
          onClick={() => void runHelperAction(releaseMacosCameraServices)}
          className="rounded-sm border border-amber-500/50 px-2 py-1 text-[11px] text-amber-100 disabled:opacity-50"
        >
          {t("camera.macos.helper.release")}
        </button>
        <button
          type="button"
          disabled={helperBusy}
          onClick={() => void runHelperAction(restoreMacosCameraServices)}
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
