import { describe, expect, it } from "vitest";
import {
  macosCameraHelperNeedsRestore,
  type MacosCameraHelperStatus,
} from "../src/lib/macos-camera-helper";

function status(
  ptpcamerad: Partial<MacosCameraHelperStatus["services"]["ptpcamerad"]>,
  icdd: Partial<MacosCameraHelperStatus["services"]["icdd"]>,
): MacosCameraHelperStatus {
  return {
    ok: true,
    platform: "darwin",
    uid: 501,
    services: {
      ptpcamerad: {
        disabled: false,
        pids: [],
        suspendedPids: [],
        runningPids: [],
        ...ptpcamerad,
      },
      icdd: {
        disabled: false,
        pids: [],
        suspendedPids: [],
        runningPids: [],
        ...icdd,
      },
    },
  };
}

describe("macos camera helper client", () => {
  it("requires restore when a service is disabled or suspended", () => {
    expect(
      macosCameraHelperNeedsRestore(
        status({ disabled: true, suspendedPids: [93856] }, { runningPids: [17376] }),
      ),
    ).toBe(true);
  });

  it("does not require restore when services are enabled and not suspended", () => {
    expect(
      macosCameraHelperNeedsRestore(
        status({ runningPids: [93856] }, { runningPids: [17376] }),
      ),
    ).toBe(false);
  });
});

