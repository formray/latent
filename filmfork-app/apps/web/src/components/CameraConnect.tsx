import clsx from "clsx";
import type { JSX } from "react";
import { useCameraStore, type ConnectFn } from "../stores/camera";
import { useT, type MessageKey } from "../i18n";

export interface CameraConnectProps {
  /** Test seam: lets unit tests inject a mock connectAndReadPresets impl. */
  connectImpl?: ConnectFn;
}

export function CameraConnect({ connectImpl }: CameraConnectProps): JSX.Element {
  const t = useT();
  const connecting = useCameraStore((s) => s.connecting);
  const connected = useCameraStore((s) => s.connected);
  const cameraModel = useCameraStore((s) => s.cameraModel);
  const error = useCameraStore((s) => s.error);
  const connect = useCameraStore((s) => s.connect);
  const disconnect = useCameraStore((s) => s.disconnect);
  const clearError = useCameraStore((s) => s.clearError);

  const onClick = (): void => {
    if (connected) {
      void disconnect();
      return;
    }
    if (error) clearError();
    void connect(connectImpl);
  };

  const labelKey: MessageKey = connecting
    ? "camera.connecting"
    : connected
      ? "camera.connected"
      : "camera.connect";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {connected && cameraModel && (
          <span
            data-testid="camera-status"
            className="font-mono text-[10px] uppercase tracking-wider text-emerald-400"
          >
            {cameraModel}
          </span>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={connecting}
          className={clsx(
            "rounded-sm border px-3 py-1.5 text-xs transition-colors",
            connected
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/60"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800",
            connecting && "cursor-wait opacity-70",
          )}
          aria-busy={connecting}
        >
          {connected ? t("camera.disconnect") : t(labelKey)}
        </button>
      </div>
      {error && (
        <CameraErrorBanner error={error} />
      )}
    </div>
  );
}

function CameraErrorBanner({
  error,
}: {
  error: { category: string; message: string };
}): JSX.Element {
  const t = useT();
  const titleKey = `error.${error.category}.title` as MessageKey;
  const bodyKey = `error.${error.category}.body` as MessageKey;
  const fallbackTitle = t("error.generic.title");
  const fallbackBody = t("error.generic.body");
  const title = safeT(t, titleKey, fallbackTitle);
  const body = safeT(t, bodyKey, fallbackBody);

  return (
    <div
      role="alert"
      className="max-w-sm rounded-sm border border-red-500/30 bg-red-500/5 px-3 py-2 text-right"
    >
      <p className="text-xs font-medium text-red-300">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-red-300/80">{body}</p>
    </div>
  );
}

function safeT(
  t: (k: MessageKey) => string,
  key: MessageKey,
  fallback: string,
): string {
  const v = t(key);
  // when key is missing in catalog, our translator returns the key itself
  return v === key ? fallback : v;
}
