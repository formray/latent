import type { JSX } from "react";
import { useCameraStore } from "../../stores/camera";
import { ConnectButton } from "./ConnectButton";
import { ConnectingIndicator } from "./ConnectingIndicator";
import { ConnectedBadge } from "./ConnectedBadge";
import { DegradedBanner } from "./DegradedBanner";
import { ErrorBanner } from "./ErrorBanner";

export function CameraConnect(): JSX.Element {
  const state = useCameraStore((s) => s.state);
  const connect = useCameraStore((s) => s.connect);
  const disconnect = useCameraStore((s) => s.disconnect);
  const retry = useCameraStore((s) => s.retry);
  const openMacosWizard = useCameraStore((s) => s.openMacosWizard);

  if (state.kind === "connecting" || state.kind === "reconnecting") {
    return <ConnectingIndicator attempt={state.attempt} />;
  }

  if (state.kind === "connected") {
    return (
      <ConnectedBadge
        cameraModel={state.cameraModel}
        firmwareVersion={state.firmwareVersion}
        onDisconnect={disconnect}
      />
    );
  }

  if (state.kind === "degraded") {
    return (
      <div className="flex flex-col items-end gap-2">
        <ConnectedBadge
          cameraModel={state.cameraModel}
          firmwareVersion={state.firmwareVersion}
          onDisconnect={disconnect}
        />
        <DegradedBanner />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <ErrorBanner
        reason={state.reason}
        details={state.underlying.message}
        onRetry={retry}
        onOpenMacosSetup={openMacosWizard}
        onConnect={connect}
      />
    );
  }

  return <ConnectButton onConnect={connect} />;
}
