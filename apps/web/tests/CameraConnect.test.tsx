import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CameraConnect } from "../src/components/CameraConnect";
import { useCameraStore } from "../src/stores/camera";
import { LatentError } from "@latent/ptp-fuji";

describe("<CameraConnect />", () => {
  beforeEach(() => {
    useCameraStore.setState({
      session: null,
      presets: [],
      connecting: false,
      connected: false,
      error: null,
      cameraModel: null,
    });
    // jsdom does not implement WebUSB — pretend it does for these tests.
    if (!("usb" in navigator)) {
      Object.assign(navigator, { usb: {} });
    }
  });

  it("renders the connect button in its idle state", () => {
    render(<CameraConnect />);
    expect(
      screen.getByRole("button", { name: /connect camera/i }),
    ).toBeInTheDocument();
  });

  it("shows the connected state and camera model after a successful connect", async () => {
    const connectImpl = vi.fn().mockResolvedValue({
      session: { close: vi.fn().mockResolvedValue(undefined) },
      presets: [],
    });

    render(<CameraConnect connectImpl={connectImpl} />);
    fireEvent.click(screen.getByRole("button", { name: /connect camera/i }));

    await waitFor(() => {
      expect(connectImpl).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(useCameraStore.getState().connected).toBe(true);
    });
    expect(screen.getByTestId("camera-status")).toHaveTextContent("X-S20");
    expect(
      screen.getByRole("button", { name: /disconnect/i }),
    ).toBeInTheDocument();
  });

  it("renders a recovery banner when connect fails with UsbPermissionDenied", async () => {
    const connectImpl = vi
      .fn()
      .mockRejectedValue(
        new LatentError(
          "UsbPermissionDenied",
          "User cancelled the picker.",
        ),
      );

    render(<CameraConnect connectImpl={connectImpl} />);
    fireEvent.click(screen.getByRole("button", { name: /connect camera/i }));

    await waitFor(() => {
      expect(useCameraStore.getState().error?.category).toBe(
        "UsbPermissionDenied",
      );
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no camera selected/i);
  });

  it("clicking disconnect calls session.close() and clears the connected state", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    useCameraStore.setState({
      session: { close } as unknown as never,
      presets: [],
      connected: true,
      connecting: false,
      cameraModel: "X-S20",
      error: null,
    });

    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(close).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(useCameraStore.getState().connected).toBe(false);
    });
  });
});
