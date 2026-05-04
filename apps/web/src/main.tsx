import React from "react";
import ReactDOM from "react-dom/client";
import { ConnectionManager, WebUsbCameraDriver } from "@latent/camera-connection";
import { LatentError } from "@latent/ptp-fuji";
import { App } from "./App";
import "./index.css";
import { useCameraStore, wireCameraManager } from "./stores/camera";

if (typeof window !== "undefined" && window.isSecureContext === false) {
  useCameraStore.setState({
    state: {
      kind: "error",
      reason: "secure-context",
      underlying: new LatentError(
        "WebUSBSecureContextRequired",
        "WebUSB requires HTTPS or localhost.",
      ),
      isPhysicallyRecoverable: false,
    },
  });
} else if (typeof navigator !== "undefined" && "usb" in navigator) {
  const usbNavigator = navigator as Navigator & {
    usb?: { getDevices(): Promise<Array<{ vendorId: number }>> };
  };
  const driver = new WebUsbCameraDriver();
  const manager = new ConnectionManager(driver, {
    shouldAutoconnect: async () => {
      const devices = await usbNavigator.usb?.getDevices() ?? [];
      return devices.some((device) => device.vendorId === 0x04cb);
    },
  });
  wireCameraManager(manager);
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Latent: #root element not found in index.html");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
