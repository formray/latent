import type { LatentError } from "@latent/ptp-fuji";
import type { ErrorReason } from "./types.js";

export function classifyDriverError(err: LatentError): ErrorReason {
  switch (err.stage) {
    case "claim":
      if (err.domException === "NetworkError" && err.platform === "mac") {
        return "macos-claim-collision";
      }
      return "session-stale";
    case "transfer-in":
    case "transfer-out":
      return "cable-unplugged";
    case "open":
    case "reset":
    case "setup-config":
    case "endpoint-discovery":
      return "session-stale";
  }

  switch (err.category) {
    case "PtpStall":
    case "PtpTimeout":
      return "camera-off";
    case "UsbPermissionDenied":
      return "permission-denied";
    case "WebUSBSecureContextRequired":
      return "secure-context";
    case "WebUSBUnsupported":
      return "webusb-unsupported";
    case "UsbDisconnect":
      return "cable-unplugged";
    default:
      return "unknown";
  }
}
