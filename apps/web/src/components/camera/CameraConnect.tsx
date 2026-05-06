import type { JSX } from "react";
import { useCameraStore } from "../../stores/camera";
import { ConnectButton } from "./ConnectButton";
import { ConnectingIndicator } from "./ConnectingIndicator";
import { ConnectedBadge } from "./ConnectedBadge";
import { DegradedBanner } from "./DegradedBanner";
import { ErrorBanner } from "./ErrorBanner";
import { MacosBetaWarning } from "./MacosBetaWarning";
import { MacosSetupWizard } from "./MacosSetupWizard";
import { MacosServicesControl } from "./MacosServicesControl";

export function CameraConnect(): JSX.Element {
  const state = useCameraStore((s) => s.state);
  const connect = useCameraStore((s) => s.connect);
  const disconnect = useCameraStore((s) => s.disconnect);
  const retry = useCameraStore((s) => s.retry);
  const openMacosWizard = useCameraStore((s) => s.openMacosWizard);
  const closeMacosWizard = useCameraStore((s) => s.closeMacosWizard);
  const macosBetaAcknowledged = useCameraStore((s) => s.macosBetaAcknowledged);
  const acknowledgeMacosBeta = useCameraStore((s) => s.acknowledgeMacosBeta);
  const macosWizardOpen = useCameraStore((s) => s.macosWizardOpen);
  const macosShowAdvanced = useCameraStore((s) => s.macosShowAdvanced);
  const macosSetupAcknowledged = useCameraStore((s) => s.macosSetupAcknowledged);
  const attemptMacosSetup = useCameraStore((s) => s.attemptMacosSetup);
  const toggleMacosAdvanced = useCameraStore((s) => s.toggleMacosAdvanced);
  const resetMacosSetupStatus = useCameraStore((s) => s.resetMacosSetupStatus);
  const overlay = (
    <>
      {state.kind === "error" &&
      state.reason === "macos-claim-collision" &&
      !macosWizardOpen &&
      !macosBetaAcknowledged ? (
        <MacosBetaWarning onAcknowledge={acknowledgeMacosBeta} />
      ) : null}
      {macosWizardOpen ? (
        <MacosSetupWizard
          acknowledged={macosSetupAcknowledged}
          showAdvanced={macosShowAdvanced}
          onRunBasic={() => attemptMacosSetup(false)}
          onRunAdvanced={() => attemptMacosSetup(true)}
          onShowAdvanced={toggleMacosAdvanced}
          onReset={resetMacosSetupStatus}
          onClose={closeMacosWizard}
        />
      ) : null}
      {!macosWizardOpen ? <MacosServicesControl variant="compact" /> : null}
    </>
  );

  if (state.kind === "connecting" || state.kind === "reconnecting") {
    return <Stack main={<ConnectingIndicator attempt={state.attempt} />} overlay={overlay} />;
  }

  if (state.kind === "connected") {
    return (
      <Stack
        main={
          <ConnectedBadge
            cameraModel={state.cameraModel}
            firmwareVersion={state.firmwareVersion}
            onDisconnect={disconnect}
          />
        }
        overlay={overlay}
      />
    );
  }

  if (state.kind === "degraded") {
    return (
      <Stack
        main={
          <div className="flex flex-col items-end gap-2">
            <ConnectedBadge
              cameraModel={state.cameraModel}
              firmwareVersion={state.firmwareVersion}
              onDisconnect={disconnect}
            />
            <DegradedBanner />
          </div>
        }
        overlay={overlay}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <Stack
        main={
          <ErrorBanner
            reason={state.reason}
            details={state.underlying.message}
            onRetry={retry}
            onOpenMacosSetup={openMacosWizard}
            onConnect={connect}
          />
        }
        overlay={overlay}
      />
    );
  }

  return <Stack main={<ConnectButton onConnect={connect} />} overlay={overlay} />;
}

function Stack({ main, overlay }: { main: JSX.Element; overlay: JSX.Element }): JSX.Element {
  return (
    <div className="flex flex-col items-end gap-2">
      {main}
      {overlay}
    </div>
  );
}
