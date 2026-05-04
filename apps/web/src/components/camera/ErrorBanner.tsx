import type { JSX } from "react";
import type { ErrorReason } from "@latent/camera-connection";
import { useT, type MessageKey } from "../../i18n";

interface ErrorBannerProps {
  reason: ErrorReason;
  details?: string;
  onRetry: () => void;
  onOpenMacosSetup: () => void;
  onConnect: () => void;
}

const copyKeys: Record<ErrorReason, { title: MessageKey; body: MessageKey; action?: MessageKey }> = {
  "macos-claim-collision": {
    title: "camera.error.macos-claim-collision.title",
    body: "camera.error.macos-claim-collision.body",
    action: "camera.error.macos-claim-collision.action",
  },
  "camera-off": {
    title: "camera.error.camera-off.title",
    body: "camera.error.camera-off.body",
    action: "camera.error.camera-off.action",
  },
  "cable-unplugged": {
    title: "camera.error.cable-unplugged.title",
    body: "camera.error.cable-unplugged.body",
  },
  "permission-denied": {
    title: "camera.error.permission-denied.title",
    body: "camera.error.permission-denied.body",
    action: "camera.error.permission-denied.action",
  },
  "secure-context": {
    title: "camera.error.secure-context.title",
    body: "camera.error.secure-context.body",
  },
  "webusb-unsupported": {
    title: "camera.error.webusb-unsupported.title",
    body: "camera.error.webusb-unsupported.body",
  },
  "session-stale": {
    title: "camera.error.session-stale.title",
    body: "camera.error.session-stale.body",
    action: "camera.error.session-stale.action",
  },
  unknown: {
    title: "camera.error.unknown.title",
    body: "camera.error.unknown.body",
    action: "camera.error.unknown.action",
  },
};

export function ErrorBanner({
  reason,
  details,
  onRetry,
  onOpenMacosSetup,
  onConnect,
}: ErrorBannerProps): JSX.Element {
  const t = useT();
  const copy = copyKeys[reason];
  const action = actionFor(reason, { onRetry, onOpenMacosSetup, onConnect });

  return (
    <div
      role="alert"
      className="max-w-sm rounded-sm border border-red-500/30 bg-red-500/5 px-3 py-2 text-right"
    >
      <p className="text-xs font-medium text-red-300">{t(copy.title)}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-red-300/80">
        {t(copy.body)}
      </p>
      {reason === "unknown" && details ? (
        <p className="mt-1 font-mono text-[11px] text-red-300/70">{details}</p>
      ) : null}
      {copy.action ? (
        <button
          type="button"
          onClick={action}
          className="mt-2 rounded-sm border border-red-500/30 px-2 py-1 text-[11px] text-red-200"
        >
          {t(copy.action)}
        </button>
      ) : null}
    </div>
  );
}

function actionFor(
  reason: ErrorReason,
  actions: {
    onRetry: () => void;
    onOpenMacosSetup: () => void;
    onConnect: () => void;
  },
): () => void {
  if (reason === "macos-claim-collision") return actions.onOpenMacosSetup;
  if (reason === "permission-denied") return actions.onConnect;
  return actions.onRetry;
}
