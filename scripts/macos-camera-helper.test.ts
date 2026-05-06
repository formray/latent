import { describe, expect, it } from "vitest";
import { parseCameraProcesses, parseDisabledServices } from "./macos-camera-helper";

describe("macOS camera helper parsers", () => {
  it("parses disabled launchctl services", () => {
    const disabled = parseDisabledServices(`
        "com.apple.ptpcamerad" => disabled
        "com.apple.icdd" => enabled
    `);
    expect(disabled.has("com.apple.ptpcamerad")).toBe(true);
    expect(disabled.has("com.apple.icdd")).toBe(false);
  });

  it("parses camera daemon processes and suspended state", () => {
    const processes = parseCameraProcesses(`
      14124 T    /System/Library/Image Capture/Support/icdd
      93856 S    /usr/libexec/ptpcamerad
      11111 S    /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
    `);
    expect(processes).toEqual([
      { name: "icdd", pid: 14124, stat: "T" },
      { name: "ptpcamerad", pid: 93856, stat: "S" },
    ]);
  });
});

