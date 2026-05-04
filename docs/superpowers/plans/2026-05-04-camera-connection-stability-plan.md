# Camera Connection Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a stable camera connection layer that recovers from every
documented failure mode (refresh, unplug, sleep, macOS daemon claim,
session-stale) without requiring physical power-cycle of the camera.

**Architecture:** Separate `ConnectionManager` + `CameraDriver` interface
+ `CameraSessionPort` abstraction in a new `@latent/camera-connection`
package. State machine has 7 explicit states; listener lifecycle is
connection-generation-owned; classifier reads structured `stage`
metadata on `LatentError`. macOS first-run wizard with safer-first
default plus advanced opt-in. Full design lives in
`docs/superpowers/specs/2026-05-04-camera-connection-stability-design.md`.

**Tech Stack:** TypeScript 5.7 strict, Vitest 2, Zustand 5, React 19,
Tailwind v4, npm workspaces, Node 22.

---

## Operating rules for implementers

- Work one task at a time. Do not start the next task until the current task's tests pass and its commit is created.
- Keep the commit boundaries exactly aligned to the task headings below.
- Use npm only. Do not use pnpm or yarn.
- Run commands from `the repo root`.
- Each commit message must end with:

```text
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- Expected Vitest output in this plan shows the meaningful failing or passing line. Extra timing lines are acceptable.

---

## Task 0 — Step 0: Extend `LatentError` with structured stage metadata

**Files**

- Create: none
- Modify: `packages/ptp-fuji/src/errors.ts`, `packages/ptp-fuji-webusb/src/request-camera.ts`, `packages/ptp-fuji-webusb/src/webusb-transport.ts`
- Test: `packages/ptp-fuji/tests/errors.test.ts`, `packages/ptp-fuji-webusb/tests/request-camera.test.ts`, `packages/ptp-fuji-webusb/tests/webusb-transport.test.ts`

**TDD cycle 0.1 — metadata constructor support, 5 tests**

Test names:

- `LatentError stores stage metadata`
- `LatentError stores domException metadata`
- `LatentError stores platform metadata`
- `LatentError exposes metadata object for rewrap`
- `LatentError preserves cause while adding metadata`

- [ ] Add these tests to `packages/ptp-fuji/tests/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LatentError } from "../src/errors.js";

describe("LatentError metadata", () => {
  it("stores stage metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      stage: "claim",
    });
    expect(err.stage).toBe("claim");
  });

  it("stores domException metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      domException: "NetworkError",
    });
    expect(err.domException).toBe("NetworkError");
  });

  it("stores platform metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      platform: "mac",
    });
    expect(err.platform).toBe("mac");
  });

  it("exposes metadata object for rewrap", () => {
    const err = new LatentError("UsbDisconnect", "transfer failed", undefined, {
      stage: "transfer-in",
      domException: "NetworkError",
      platform: "linux",
    });
    expect(err.metadata).toEqual({
      stage: "transfer-in",
      domException: "NetworkError",
      platform: "linux",
    });
  });

  it("preserves cause while adding metadata", () => {
    const cause = new Error("raw");
    const err = new LatentError("UsbDisconnect", "wrapped", cause, {
      stage: "transfer-out",
    });
    expect(err.cause).toBe(cause);
    expect(err.stage).toBe("transfer-out");
  });
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- errors.test.ts
```

Expected FAIL:

```text
FAIL  packages/ptp-fuji/tests/errors.test.ts > LatentError metadata > stores stage metadata
AssertionError: expected undefined to be 'claim'
```

- [ ] Replace `packages/ptp-fuji/src/errors.ts` with:

```ts
/**
 * Typed error taxonomy for @latent/ptp-fuji and consumers.
 *
 * Categories per spec §6.9 (R5.1) — note `WebUSBSecureContextRequired`
 * was renamed from `WebUsbSecureContextRequired` for casing consistency
 * with the other WebUSB-prefixed members.
 */

export type LatentErrorCategory =
  | "PtpSessionAlreadyOpen"
  | "PtpDeviceBusy"
  | "PtpUnsupportedOperation"
  | "PtpStall"
  | "PtpTimeout"
  | "UsbDisconnect"
  | "UsbPermissionDenied"
  | "WebUSBSecureContextRequired"
  | "WebUSBUnsupported"
  | "CameraInWrongMode"
  | "CameraBatteryLow"
  | "CameraUnknownModel"
  | "FirmwareUnsupported"
  | "WriteFailed"
  | "RestoreFailed"
  | "BackupIncomplete"
  | "ConversionFailed"
  | "RafFormatInvalid"
  | "AiRateLimit"
  | "AiNetwork"
  | "AiAuth"
  | "AiServer"
  | "AiPayloadTooLarge"
  | "AiModelUnavailable"
  | "RecipeSchemaInvalid"
  | "RecipeCapabilityMismatch"
  | "RecipeUrlPayloadTooLarge";

export type LatentErrorStage =
  | "open"
  | "claim"
  | "transfer-in"
  | "transfer-out"
  | "reset"
  | "setup-config"
  | "endpoint-discovery";

export type LatentPlatform = "mac" | "windows" | "linux" | "unknown";

export interface LatentErrorMetadata {
  stage?: LatentErrorStage;
  domException?: string;
  platform?: LatentPlatform;
}

export class LatentError extends Error {
  readonly category: LatentErrorCategory;
  readonly stage?: LatentErrorStage;
  readonly domException?: string;
  readonly platform?: LatentPlatform;
  readonly metadata: LatentErrorMetadata;
  override readonly cause?: unknown;

  constructor(
    category: LatentErrorCategory,
    message: string,
    cause?: unknown,
    metadata: LatentErrorMetadata = {},
  ) {
    super(message);
    this.name = "LatentError";
    this.category = category;
    this.metadata = metadata;
    if (metadata.stage !== undefined) this.stage = metadata.stage;
    if (metadata.domException !== undefined) this.domException = metadata.domException;
    if (metadata.platform !== undefined) this.platform = metadata.platform;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- errors.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/errors.test.ts
```

**TDD cycle 0.2 — WebUSB throw sites carry structured metadata, 5 tests**

Test names:

- `requestFujiCamera wraps open/select failures with stage setup-config`
- `requestFujiCamera wraps claim failures with stage claim`
- `requestFujiCamera stores DOMException name on claim failure`
- `WebUsbPtpTransport wraps raw transferOut rejection with stage transfer-out`
- `WebUsbPtpTransport wraps raw transferIn rejection with stage transfer-in`

- [ ] Add the request-camera tests to `packages/ptp-fuji-webusb/tests/request-camera.test.ts`:

```ts
it("wraps open/select failures with stage setup-config", async () => {
  const { device } = makeMockDevice();
  device.open.mockRejectedValueOnce(new DOMException("blocked", "NetworkError"));
  const restore = setNavigator({
    usb: {
      requestDevice: vi.fn(async () => device),
      getDevices: vi.fn(async () => []),
    },
  });
  try {
    await expect(requestFujiCamera()).rejects.toMatchObject({
      category: "UsbDisconnect",
      stage: "setup-config",
      domException: "NetworkError",
    });
  } finally {
    restore();
  }
});

it("wraps claim failures with stage claim", async () => {
  const { device } = makeMockDevice();
  device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
  const restore = setNavigator({
    usb: {
      requestDevice: vi.fn(async () => device),
      getDevices: vi.fn(async () => []),
    },
  });
  try {
    await expect(requestFujiCamera()).rejects.toMatchObject({
      category: "UsbDisconnect",
      stage: "claim",
    });
  } finally {
    restore();
  }
});

it("stores DOMException name on claim failure", async () => {
  const { device } = makeMockDevice();
  device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
  const restore = setNavigator({
    usb: {
      requestDevice: vi.fn(async () => device),
      getDevices: vi.fn(async () => []),
    },
  });
  try {
    await expect(requestFujiCamera()).rejects.toMatchObject({
      domException: "NetworkError",
    });
  } finally {
    restore();
  }
});
```

- [ ] Add the transport tests to `packages/ptp-fuji-webusb/tests/webusb-transport.test.ts`:

```ts
it("wraps raw transferOut rejection with stage transfer-out", async () => {
  const device = makeTransferDevice({
    transferOut: vi.fn(async () => {
      throw new DOMException("gone", "NetworkError");
    }),
  });
  const t = new WebUsbPtpTransport(device, 1, 2);
  await expect(t.send(new Uint8Array([1]))).rejects.toMatchObject({
    category: "UsbDisconnect",
    stage: "transfer-out",
    domException: "NetworkError",
  });
});

it("wraps raw transferIn rejection with stage transfer-in", async () => {
  const device = makeTransferDevice({
    transferIn: vi.fn(async () => {
      throw new DOMException("gone", "NetworkError");
    }),
  });
  const t = new WebUsbPtpTransport(device, 1, 2);
  await expect(t.receive()).rejects.toMatchObject({
    category: "UsbDisconnect",
    stage: "transfer-in",
    domException: "NetworkError",
  });
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji-webusb -- request-camera.test.ts webusb-transport.test.ts
```

Expected FAIL:

```text
FAIL  packages/ptp-fuji-webusb/tests/request-camera.test.ts > requestFujiCamera > wraps claim failures with stage claim
AssertionError: expected undefined to be 'claim'
```

- [ ] Add helper functions to both WebUSB source files:

```ts
function nameOf(err: unknown): string | undefined {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name;
  }
  const maybe = err as { name?: unknown } | null;
  return typeof maybe?.name === "string" ? maybe.name : undefined;
}

function detectPlatform(): "mac" | "windows" | "linux" | "unknown" {
  const platform = globalThis.navigator?.platform?.toLowerCase() ?? "";
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "unknown";
}
```

- [ ] In `request-camera.ts`, update the `LatentError` constructors in open/select, claim, missing configuration, and endpoint discovery paths to pass metadata. Use this exact pattern:

```ts
throw new LatentError(
  "UsbDisconnect",
  `failed to claim PTP interface (another app may hold it): ${stringifyError(err)}`,
  err,
  {
    stage: "claim",
    domException: nameOf(err),
    platform: detectPlatform(),
  },
);
```

- [ ] In `webusb-transport.ts`, wrap `transferOut` and `transferIn` in `try` / `catch`, and add stage metadata to non-OK status errors:

```ts
let result: USBOutTransferResult;
try {
  result = await this.raceWithSignal(
    this.device.transferOut(this.endpointOut, chunk),
    signal,
  );
} catch (err) {
  throw new LatentError("UsbDisconnect", "WebUSB transferOut threw", err, {
    stage: "transfer-out",
    domException: nameOf(err),
    platform: detectPlatform(),
  });
}
if (result.status !== "ok") {
  throw new LatentError(
    "PtpStall",
    `WebUSB transferOut returned status="${result.status}"`,
    undefined,
    {
      stage: "transfer-out",
      platform: detectPlatform(),
    },
  );
}
```

```ts
let result: USBInTransferResult;
try {
  result = await this.raceWithSignal(
    this.device.transferIn(this.endpointIn, this.maxChunkSize),
    signal,
  );
} catch (err) {
  throw new LatentError("UsbDisconnect", "WebUSB transferIn threw", err, {
    stage: "transfer-in",
    domException: nameOf(err),
    platform: detectPlatform(),
  });
}
if (result.status !== "ok") {
  throw new LatentError(
    "PtpStall",
    `WebUSB transferIn returned status="${result.status}"`,
    undefined,
    {
      stage: "transfer-in",
      platform: detectPlatform(),
    },
  );
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji-webusb -- request-camera.test.ts webusb-transport.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji-webusb/tests/request-camera.test.ts
PASS  packages/ptp-fuji-webusb/tests/webusb-transport.test.ts
```

- [ ] Run the full affected package tests:

```sh
npm run test --workspace=@latent/ptp-fuji
npm run test --workspace=@latent/ptp-fuji-webusb
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/errors.test.ts
PASS  packages/ptp-fuji-webusb/tests/request-camera.test.ts
PASS  packages/ptp-fuji-webusb/tests/webusb-transport.test.ts
```

- [ ] Commit:

```sh
git add packages/ptp-fuji/src/errors.ts packages/ptp-fuji/tests/errors.test.ts packages/ptp-fuji-webusb/src/request-camera.ts packages/ptp-fuji-webusb/src/webusb-transport.ts packages/ptp-fuji-webusb/tests/request-camera.test.ts packages/ptp-fuji-webusb/tests/webusb-transport.test.ts
git commit -m $'refactor: add structured camera error metadata\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 1a — Step 1a: Tighten `PtpFraming.sendCommand()` validation

**Files**

- Create: `packages/ptp-fuji/tests/ptp-framing.test.ts`
- Modify: `packages/ptp-fuji/src/ptp/transport.ts`
- Test: `packages/ptp-fuji/tests/ptp-framing.test.ts`

**TDD cycle 1a.1 — validate response shape and transaction, 5 tests**

Test names:

- `sendCommand rejects a short response`
- `sendCommand rejects a non-response final container`
- `sendCommand rejects a mismatched response transaction id`
- `sendCommand accepts DATA followed by matching RESPONSE`
- `sendDataCommand rejects a mismatched response transaction id`

- [ ] Create `packages/ptp-fuji/tests/ptp-framing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LatentError } from "../src/errors.js";
import { ContainerType, PTPResp } from "../src/ptp/constants.js";
import { packContainer } from "../src/ptp/container.js";
import { PtpFraming } from "../src/ptp/transport.js";
import { FakeTransport } from "./fake-transport.js";

function response(code: number, txid: number): Uint8Array {
  return packContainer({
    type: ContainerType.Response,
    code,
    transactionId: txid,
    params: [],
    data: new Uint8Array(0),
  });
}

function data(opcode: number, txid: number, bytes = [1, 2, 3]): Uint8Array {
  return packContainer({
    type: ContainerType.Data,
    code: opcode,
    transactionId: txid,
    params: [],
    data: new Uint8Array(bytes),
  });
}

describe("PtpFraming validation", () => {
  it("rejects a short response", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([1, 2, 3]));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("rejects a non-response final container", async () => {
    const t = new FakeTransport();
    t.enqueue(data(0x1001, 1));
    t.enqueue(data(0x1001, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toBeInstanceOf(LatentError);
  });

  it("rejects a mismatched response transaction id", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OK, 99));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("accepts DATA followed by matching RESPONSE", async () => {
    const t = new FakeTransport();
    t.enqueue(data(0x1001, 1, [9, 8]));
    t.enqueue(response(PTPResp.OK, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).resolves.toMatchObject({
      code: PTPResp.OK,
      data: new Uint8Array([9, 8]),
    });
  });

  it("rejects a mismatched response transaction id for sendDataCommand", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OK, 77));
    const framing = new PtpFraming(t);
    await expect(
      framing.sendDataCommand(0x1016, [1], new Uint8Array([2])),
    ).rejects.toMatchObject({
      category: "PtpStall",
    });
  });
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- ptp-framing.test.ts
```

Expected FAIL:

```text
FAIL  packages/ptp-fuji/tests/ptp-framing.test.ts > PtpFraming validation > rejects a mismatched response transaction id
AssertionError: promise resolved instead of rejecting
```

- [ ] In `packages/ptp-fuji/src/ptp/transport.ts`, import `LatentError` and `PTPResp`, then add this helper below `MAX_RESPONSE_BYTES`:

```ts
function assertResponse(
  resp: PTPContainerData,
  expectedTransactionId: number,
): void {
  if (resp.type !== ContainerType.Response) {
    throw new LatentError(
      "PtpStall",
      `expected RESPONSE container, got type=${resp.type}`,
    );
  }
  if (resp.transactionId !== expectedTransactionId) {
    throw new LatentError(
      "PtpStall",
      `txid mismatch: expected ${expectedTransactionId}, got ${resp.transactionId}`,
    );
  }
  if (resp.code === PTPResp.OK) return;
  if (resp.code === PTPResp.SessionAlreadyOpen) {
    throw new LatentError("PtpSessionAlreadyOpen", "PTP session is already open");
  }
  if (resp.code === PTPResp.DeviceBusy) {
    throw new LatentError("PtpDeviceBusy", "PTP device is busy");
  }
  throw new LatentError(
    "PtpUnsupportedOperation",
    `PTP response code 0x${resp.code.toString(16)}`,
  );
}
```

- [ ] In `sendCommand` and `sendDataCommand`, replace final type checks with:

```ts
assertResponse(resp, transactionId);
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- ptp-framing.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/ptp-framing.test.ts
```

**TDD cycle 1a.2 — classify non-OK response codes, 5 tests**

Test names:

- `sendCommand maps SessionAlreadyOpen to PtpSessionAlreadyOpen`
- `sendCommand maps DeviceBusy to PtpDeviceBusy`
- `sendCommand maps OperationNotSupported to PtpUnsupportedOperation`
- `sendDataCommand maps DeviceBusy to PtpDeviceBusy`
- `sendCommand keeps existing OK response behaviour`

- [ ] Extend `packages/ptp-fuji/tests/ptp-framing.test.ts`:

```ts
it("maps SessionAlreadyOpen to PtpSessionAlreadyOpen", async () => {
  const t = new FakeTransport();
  t.enqueue(response(PTPResp.SessionAlreadyOpen, 1));
  const framing = new PtpFraming(t);
  await expect(framing.sendCommand(0x1002)).rejects.toMatchObject({
    category: "PtpSessionAlreadyOpen",
  });
});

it("maps DeviceBusy to PtpDeviceBusy", async () => {
  const t = new FakeTransport();
  t.enqueue(response(PTPResp.DeviceBusy, 1));
  const framing = new PtpFraming(t);
  await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
    category: "PtpDeviceBusy",
  });
});

it("maps OperationNotSupported to PtpUnsupportedOperation", async () => {
  const t = new FakeTransport();
  t.enqueue(response(PTPResp.OperationNotSupported, 1));
  const framing = new PtpFraming(t);
  await expect(framing.sendCommand(0x9999)).rejects.toMatchObject({
    category: "PtpUnsupportedOperation",
  });
});

it("maps DeviceBusy to PtpDeviceBusy for sendDataCommand", async () => {
  const t = new FakeTransport();
  t.enqueue(response(PTPResp.DeviceBusy, 1));
  const framing = new PtpFraming(t);
  await expect(
    framing.sendDataCommand(0x1016, [1], new Uint8Array([2])),
  ).rejects.toMatchObject({
    category: "PtpDeviceBusy",
  });
});

it("keeps existing OK response behaviour", async () => {
  const t = new FakeTransport();
  t.enqueue(response(PTPResp.OK, 1));
  const framing = new PtpFraming(t);
  await expect(framing.sendCommand(0x1001)).resolves.toMatchObject({
    code: PTPResp.OK,
    params: [],
  });
});
```

- [ ] If `PTPResp.SessionAlreadyOpen`, `PTPResp.DeviceBusy`, or `PTPResp.OperationNotSupported` is absent from `packages/ptp-fuji/src/ptp/constants.ts`, add:

```ts
SessionAlreadyOpen: 0x201e,
DeviceBusy: 0x2019,
OperationNotSupported: 0x2005,
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- ptp-framing.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/ptp-framing.test.ts
```

- [ ] Run the full package tests:

```sh
npm run test --workspace=@latent/ptp-fuji
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/ptp-framing.test.ts
PASS  packages/ptp-fuji/tests/session.test.ts
```

- [ ] Commit:

```sh
git add packages/ptp-fuji/src/ptp/transport.ts packages/ptp-fuji/src/ptp/constants.ts packages/ptp-fuji/tests/ptp-framing.test.ts
git commit -m $'refactor: validate ptp framing responses\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 1b — Step 1b: Refactor `FujiCameraSession` onto validated `PtpFraming`

**Files**

- Create: none
- Modify: `packages/ptp-fuji/src/ptp/session.ts`
- Test: `packages/ptp-fuji/tests/session.test.ts`

**TDD cycle 1b.1 — preserve session behaviour through `PtpFraming`, 5 tests**

Test names:

- `open uses PtpFraming command container`
- `open maps non-OK response through PtpFraming`
- `close uses PtpFraming command container`
- `close always closes transport after response failure`
- `fireCloseSession sends CloseSession without awaiting a response`

- [ ] Add these tests to `packages/ptp-fuji/tests/session.test.ts`:

```ts
import { LatentError } from "../src/errors.js";

it("open maps non-OK response through PtpFraming", async () => {
  const t = new FakeTransport();
  t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x19, 0x20, 1, 0, 0, 0]));
  const s = new FujiCameraSession(t);
  await expect(s.open()).rejects.toMatchObject({
    category: "PtpDeviceBusy",
  });
  expect(s.state).toBe("closed");
});

it("close always closes transport after response failure", async () => {
  const t = new FakeTransport();
  t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
  t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x19, 0x20, 2, 0, 0, 0]));
  const s = new FujiCameraSession(t);
  await s.open();
  await expect(s.close()).rejects.toBeInstanceOf(LatentError);
  expect(t.closed).toBe(true);
  expect(s.state).toBe("closed");
});

it("fireCloseSession sends CloseSession without awaiting a response", () => {
  const t = new FakeTransport();
  const s = new FujiCameraSession(t);
  s.fireCloseSession();
  expect(t.sent).toHaveLength(1);
  expect(t.sent[0]?.[6]).toBe(0x03);
  expect(t.sent[0]?.[7]).toBe(0x10);
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- session.test.ts
```

Expected FAIL:

```text
FAIL  packages/ptp-fuji/tests/session.test.ts > FujiCameraSession > fireCloseSession sends CloseSession without awaiting a response
TypeError: s.fireCloseSession is not a function
```

- [ ] Refactor `packages/ptp-fuji/src/ptp/session.ts` so the class owns a `PtpFraming` instance. Use this class body:

```ts
export class FujiCameraSession {
  private _state: SessionState = "closed";
  private readonly framing: PtpFraming;
  private readonly transport: PtpTransport;
  private readonly options: SessionOptions;

  constructor(transport: PtpTransport, options: SessionOptions = {}) {
    this.transport = transport;
    this.framing = new PtpFraming(transport);
    this.options = options;
  }

  get state(): SessionState {
    return this._state;
  }

  async open(signal?: AbortSignal): Promise<void> {
    if (this._state === "open" || this._state === "opening") {
      throw new LatentError("PtpSessionAlreadyOpen", "session is already open");
    }
    this._state = "opening";
    try {
      await this.framing.sendCommand(PTPOp.OpenSession, [DEFAULT_SESSION_ID], signal);
      void this.options;
      this._state = "open";
    } catch (err) {
      this._state = "closed";
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this._state === "closed") return;
    try {
      await this.framing.sendCommand(PTPOp.CloseSession);
    } finally {
      await this.transport.close();
      this._state = "closed";
    }
  }

  fireCloseSession(): void {
    this.framing.fireCloseSession();
  }
}
```

- [ ] Delete the local `packCommand` and `assertResponseOK` helpers from `session.ts`. Import `PTPOp` and `PtpFraming`:

```ts
import { PTPOp } from "./constants.js";
import { PtpFraming } from "./transport.js";
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- session.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/session.test.ts
```

- [ ] Run both packages touched by the refactor:

```sh
npm run test --workspace=@latent/ptp-fuji
npm run test --workspace=@latent/ptp-fuji-webusb
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/session.test.ts
PASS  packages/ptp-fuji-webusb/tests/connect.test.ts
```

- [ ] Commit:

```sh
git add packages/ptp-fuji/src/ptp/session.ts packages/ptp-fuji/tests/session.test.ts
git commit -m $'refactor: route fuji session through ptp framing\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 2 — Step 2: Add `FujiCameraSession.getDeviceInfo()` with DATA to RESPONSE parsing

**Files**

- Create: none
- Modify: `packages/ptp-fuji/src/ptp/session.ts`
- Test: `packages/ptp-fuji/tests/session.test.ts`

**TDD cycle 2.1 — parse PTP DeviceInfo, 6 tests**

Test names:

- `getDeviceInfo sends GetDeviceInfo opcode 0x1001`
- `getDeviceInfo parses model`
- `getDeviceInfo parses firmwareVersion`
- `getDeviceInfo parses serialNumber when present`
- `getDeviceInfo parses supportedOps`
- `getDeviceInfo rejects when called before open`

- [ ] Add these helpers and tests to `packages/ptp-fuji/tests/session.test.ts`:

```ts
function le16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function le32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function ptpString(value: string): number[] {
  const chars = Array.from(value);
  const out = [chars.length + 1];
  for (const ch of chars) out.push(...le16(ch.charCodeAt(0)));
  out.push(0, 0);
  return out;
}

function array16(values: number[]): number[] {
  return [...le32(values.length), ...values.flatMap(le16)];
}

function deviceInfoPayload(): Uint8Array {
  return new Uint8Array([
    ...le16(100),
    ...le32(6),
    ...le16(0x100),
    ...ptpString("FUJIFILM"),
    ...ptpString("1.10"),
    ...array16([0x1001, 0x1002, 0x1003, 0x1015, 0x1016]),
    ...array16([]),
    ...array16([]),
    ...array16([]),
    ...array16([]),
    ...ptpString("X-S20"),
    ...ptpString("ABC123"),
  ]);
}

it("getDeviceInfo parses model, firmware, serial, and supported ops", async () => {
  const t = new FakeTransport();
  t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
  t.enqueue(packContainer({
    type: 2,
    code: 0x1001,
    transactionId: 2,
    params: [],
    data: deviceInfoPayload(),
  }));
  t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
  const s = new FujiCameraSession(t);
  await s.open();
  await expect(s.getDeviceInfo()).resolves.toEqual({
    model: "X-S20",
    firmwareVersion: "1.10",
    serialNumber: "ABC123",
    supportedOps: [0x1001, 0x1002, 0x1003, 0x1015, 0x1016],
  });
});

it("getDeviceInfo rejects when called before open", async () => {
  const s = new FujiCameraSession(new FakeTransport());
  await expect(s.getDeviceInfo()).rejects.toMatchObject({
    category: "PtpStall",
  });
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- session.test.ts
```

Expected FAIL:

```text
FAIL  packages/ptp-fuji/tests/session.test.ts > FujiCameraSession > getDeviceInfo parses model, firmware, serial, and supported ops
TypeError: s.getDeviceInfo is not a function
```

- [ ] In `packages/ptp-fuji/src/ptp/session.ts`, add the public result interface:

```ts
export interface FujiDeviceInfo {
  model: string;
  firmwareVersion: string;
  serialNumber?: string;
  supportedOps: number[];
}
```

- [ ] Add this method to `FujiCameraSession`:

```ts
async getDeviceInfo(signal?: AbortSignal): Promise<FujiDeviceInfo> {
  if (this._state !== "open") {
    throw new LatentError("PtpStall", "cannot read device info before session is open");
  }
  const result = await this.framing.sendCommand(PTPOp.GetDeviceInfo, [], signal);
  return parseDeviceInfo(result.data);
}
```

- [ ] Add `GetDeviceInfo: 0x1001` to `PTPOp` in `packages/ptp-fuji/src/ptp/constants.ts` if missing.

- [ ] Add `parseDeviceInfo` helpers below the class:

```ts
function parseDeviceInfo(data: Uint8Array): FujiDeviceInfo {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  const readU16 = (): number => {
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };
  const readU32 = (): number => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const readString = (): string => {
    const length = data[offset++] ?? 0;
    if (length === 0) return "";
    const chars: number[] = [];
    for (let i = 0; i < length - 1; i++) {
      chars.push(readU16());
    }
    offset += 2;
    return String.fromCharCode(...chars);
  };
  const readArray16 = (): number[] => {
    const count = readU32();
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(readU16());
    return out;
  };

  readU16();
  readU32();
  readU16();
  readString();
  const firmwareVersion = readString();
  const supportedOps = readArray16();
  readArray16();
  readArray16();
  readArray16();
  readArray16();
  const model = readString();
  const serialNumber = readString();

  return {
    model,
    firmwareVersion,
    serialNumber: serialNumber || undefined,
    supportedOps,
  };
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji -- session.test.ts
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/session.test.ts
```

- [ ] Run:

```sh
npm run test --workspace=@latent/ptp-fuji
```

Expected PASS:

```text
PASS  packages/ptp-fuji/tests/session.test.ts
PASS  packages/ptp-fuji/tests/ptp-framing.test.ts
```

- [ ] Commit:

```sh
git add packages/ptp-fuji/src/ptp/session.ts packages/ptp-fuji/src/ptp/constants.ts packages/ptp-fuji/tests/session.test.ts
git commit -m $'feat: read fuji device info through ptp session\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 3 — Step 3: Scaffold `@latent/camera-connection` package

**Files**

- Create: `packages/camera-connection/package.json`, `packages/camera-connection/tsconfig.json`, `packages/camera-connection/vitest.config.ts`, `packages/camera-connection/src/index.ts`
- Modify: `vitest.workspace.ts`, root `package.json` only if workspaces need an explicit package path
- Test: empty package test run

**Scaffold cycle 3.1 — package shell**

- [ ] Create `packages/camera-connection/package.json`:

```json
{
  "name": "@latent/camera-connection",
  "version": "0.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "LICENSE"],
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc --noEmit",
    "lint": "eslint --no-error-on-unmatched-pattern src tests",
    "test": "vitest run --config vitest.config.ts --passWithNoTests"
  },
  "dependencies": {
    "@latent/ptp-fuji": "0.0.0",
    "@latent/ptp-fuji-webusb": "0.0.0"
  },
  "devDependencies": {
    "@types/w3c-web-usb": "^1"
  }
}
```

- [ ] Create `packages/camera-connection/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests"]
}
```

- [ ] If `tsconfig.base.json` is absent, use the same `extends` value and compiler options as `packages/ptp-fuji/tsconfig.json`, changing only `outDir`, `rootDir`, and `include`.

- [ ] Create `packages/camera-connection/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "camera-connection",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
    },
  },
});
```

- [ ] Create `packages/camera-connection/src/index.ts`:

```ts
export {};
```

- [ ] Confirm root `package.json` already has `"packages/*"` in `workspaces`. Do not change it if that entry exists.

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection
npm run typecheck --workspace=@latent/camera-connection
npm run lint --workspace=@latent/camera-connection
```

Expected PASS:

```text
No test files found, exiting with code 0
```

```text
tsc --noEmit
```

```text
eslint --no-error-on-unmatched-pattern src tests
```

- [ ] Commit:

```sh
git add packages/camera-connection/package.json packages/camera-connection/tsconfig.json packages/camera-connection/vitest.config.ts packages/camera-connection/src/index.ts
git commit -m $'chore: scaffold camera connection package\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 4 — Step 4: Types, `CameraSessionPort`, and `CameraDriver` interfaces

**Files**

- Create: `packages/camera-connection/src/types.ts`, `packages/camera-connection/src/session-port.ts`, `packages/camera-connection/src/driver.ts`, `packages/camera-connection/tests/types.test.ts`
- Modify: `packages/camera-connection/src/index.ts`
- Test: `packages/camera-connection/tests/types.test.ts`

**TDD cycle 4.1 — public type surface, 6 tests**

Test names:

- `ConnectionState discriminates idle`
- `ConnectionState discriminates connecting with macos setup pending`
- `ConnectionState discriminates connected with CameraSessionPort`
- `DriverConnectResult exposes dispose`
- `ErrorReason contains all 8 reasons`
- `assertNever enforces state exhaustiveness`

- [ ] Create `packages/camera-connection/tests/types.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { CameraDriver, DriverConnectResult } from "../src/driver.js";
import type { CameraSessionPort } from "../src/session-port.js";
import { ERROR_REASONS, assertNever, type ConnectionState } from "../src/types.js";

const port: CameraSessionPort = {
  getDeviceInfo: vi.fn(async () => ({
    model: "X-S20",
    firmwareVersion: "1.10",
    supportedOps: [],
  })),
  getDevicePropValue: vi.fn(async () => ({ kind: "uint16", value: 1 })),
  setDevicePropValue: vi.fn(async () => undefined),
  isOpen: vi.fn(() => true),
};

describe("camera connection public types", () => {
  it("discriminates idle", () => {
    const state: ConnectionState = { kind: "idle" };
    expect(state.kind).toBe("idle");
  });

  it("discriminates connecting with macos setup pending", () => {
    const state: ConnectionState = {
      kind: "connecting",
      attempt: 1,
      abort: new AbortController(),
      macosSetupPending: "advanced",
    };
    expect(state.macosSetupPending).toBe("advanced");
  });

  it("discriminates connected with CameraSessionPort", () => {
    const state: ConnectionState = {
      kind: "connected",
      port,
      cameraModel: "X-S20",
      firmwareVersion: "1.10",
    };
    expect(state.port.isOpen()).toBe(true);
  });

  it("exposes DriverConnectResult.dispose", async () => {
    const result: DriverConnectResult = {
      port,
      deviceInfo: { model: "X-S20", firmwareVersion: "1.10", supportedOps: [] },
      dispose: vi.fn(async () => undefined),
    };
    await result.dispose();
    expect(result.dispose).toHaveBeenCalledTimes(1);
  });

  it("contains all 8 error reasons", () => {
    expect(ERROR_REASONS).toEqual([
      "macos-claim-collision",
      "camera-off",
      "cable-unplugged",
      "permission-denied",
      "secure-context",
      "webusb-unsupported",
      "session-stale",
      "unknown",
    ]);
  });

  it("types CameraDriver against DriverConnectResult", async () => {
    const driver: CameraDriver = {
      connect: vi.fn(async () => ({
        port,
        deviceInfo: { model: "X-S20", firmwareVersion: "1.10", supportedOps: [] },
        dispose: vi.fn(async () => undefined),
      })),
      disconnect: vi.fn(async () => undefined),
      subscribeDisconnectEvents: vi.fn(() => () => undefined),
      subscribeConnectEvents: vi.fn(() => () => undefined),
      fireCloseSession: vi.fn(() => undefined),
      probe: vi.fn(async () => true),
    };
    await expect(driver.connect()).resolves.toMatchObject({
      deviceInfo: { model: "X-S20" },
    });
  });
});

function renderState(state: ConnectionState): string {
  switch (state.kind) {
    case "idle":
    case "connecting":
    case "connected":
    case "degraded":
    case "reconnecting":
    case "error":
    case "disconnected":
      return state.kind;
    default:
      return assertNever(state);
  }
}

void renderState;
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- types.test.ts
```

Expected FAIL:

```text
FAIL  packages/camera-connection/tests/types.test.ts
Error: Failed to resolve import "../src/driver.js"
```

- [ ] Create `packages/camera-connection/src/session-port.ts`:

```ts
export interface CameraSessionPort {
  getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;
  getDevicePropValue(code: number, signal?: AbortSignal): Promise<DeviceValue>;
  setDevicePropValue(
    code: number,
    value: DeviceValue,
    signal?: AbortSignal,
  ): Promise<void>;
  isOpen(): boolean;
}

export interface DeviceInfo {
  model: string;
  firmwareVersion: string;
  serialNumber?: string;
  supportedOps: number[];
}

export type DeviceValue =
  | { kind: "uint8"; value: number }
  | { kind: "uint16"; value: number }
  | { kind: "uint32"; value: number }
  | { kind: "string"; value: string }
  | { kind: "bytes"; value: Uint8Array };
```

- [ ] Create `packages/camera-connection/src/driver.ts`:

```ts
import type { DeviceInfo, CameraSessionPort } from "./session-port.js";

export interface CameraDriver {
  connect(opts?: ConnectOptions): Promise<DriverConnectResult>;
  disconnect(): Promise<void>;
  subscribeDisconnectEvents(handler: () => void): () => void;
  subscribeConnectEvents(handler: () => void): () => void;
  fireCloseSession(): void;
  probe(timeoutMs?: number): Promise<boolean>;
}

export interface ConnectOptions {
  autoSelectPaired?: boolean;
  signal?: AbortSignal;
}

export interface DriverConnectResult {
  port: CameraSessionPort;
  deviceInfo: DeviceInfo;
  usbSerialNumber?: string;
  dispose(): Promise<void>;
}
```

- [ ] Create `packages/camera-connection/src/types.ts`:

```ts
import type { LatentError } from "@latent/ptp-fuji";
import type { CameraSessionPort } from "./session-port.js";

export const ERROR_REASONS = [
  "macos-claim-collision",
  "camera-off",
  "cable-unplugged",
  "permission-denied",
  "secure-context",
  "webusb-unsupported",
  "session-stale",
  "unknown",
] as const;

export type ErrorReason = (typeof ERROR_REASONS)[number];

export type ConnectionState =
  | { kind: "idle" }
  | {
      kind: "connecting";
      attempt: number;
      abort: AbortController;
      macosSetupPending?: "basic" | "advanced";
    }
  | {
      kind: "connected";
      port: CameraSessionPort;
      cameraModel: string;
      firmwareVersion: string;
    }
  | {
      kind: "degraded";
      port: CameraSessionPort;
      cameraModel: string;
      firmwareVersion: string;
      consecutiveSoftFailures: number;
      lastFailure: LatentError;
    }
  | {
      kind: "reconnecting";
      attempt: number;
      lastReason: ErrorReason;
      lastFailure: LatentError;
      backoffTimer: ReturnType<typeof setTimeout>;
      abort: AbortController;
    }
  | {
      kind: "error";
      reason: ErrorReason;
      underlying: LatentError;
      isPhysicallyRecoverable: boolean;
    }
  | { kind: "disconnected" };

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
```

- [ ] Replace `packages/camera-connection/src/index.ts` with:

```ts
export type {
  CameraDriver,
  ConnectOptions,
  DriverConnectResult,
} from "./driver.js";
export type {
  CameraSessionPort,
  DeviceInfo,
  DeviceValue,
} from "./session-port.js";
export {
  ERROR_REASONS,
  assertNever,
  type ConnectionState,
  type ErrorReason,
} from "./types.js";
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- types.test.ts
npm run typecheck --workspace=@latent/camera-connection
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/types.test.ts
```

- [ ] Commit:

```sh
git add packages/camera-connection/src/types.ts packages/camera-connection/src/session-port.ts packages/camera-connection/src/driver.ts packages/camera-connection/src/index.ts packages/camera-connection/tests/types.test.ts
git commit -m $'feat: define camera connection contracts\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 5 — Step 5: State machine and classifier with no I/O

**Files**

- Create: `packages/camera-connection/src/state-machine.ts`, `packages/camera-connection/src/classifier.ts`, `packages/camera-connection/tests/state-machine.test.ts`
- Modify: `packages/camera-connection/src/index.ts`
- Test: `packages/camera-connection/tests/state-machine.test.ts`

**TDD cycle 5.1 — classifier coverage, 14 tests**

Test names:

- `claim NetworkError on mac classifies macos-claim-collision`
- `claim NetworkError on linux classifies session-stale`
- `claim NetworkError on windows classifies session-stale`
- `transfer-in classifies cable-unplugged`
- `transfer-out classifies cable-unplugged`
- `open classifies session-stale`
- `reset classifies session-stale`
- `setup-config classifies session-stale`
- `endpoint-discovery classifies session-stale`
- `PtpStall without stage classifies camera-off`
- `PtpTimeout without stage classifies camera-off`
- `UsbPermissionDenied classifies permission-denied`
- `WebUSBSecureContextRequired classifies secure-context`
- `WebUSBUnsupported classifies webusb-unsupported`

- [ ] Create the classifier tests in `packages/camera-connection/tests/state-machine.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import { classifyDriverError } from "../src/classifier.js";

describe("classifyDriverError", () => {
  it.each([
    ["claim NetworkError on mac classifies macos-claim-collision", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "mac" }), "macos-claim-collision"],
    ["claim NetworkError on linux classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "linux" }), "session-stale"],
    ["claim NetworkError on windows classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "windows" }), "session-stale"],
    ["transfer-in classifies cable-unplugged", new LatentError("UsbDisconnect", "x", undefined, { stage: "transfer-in" }), "cable-unplugged"],
    ["transfer-out classifies cable-unplugged", new LatentError("UsbDisconnect", "x", undefined, { stage: "transfer-out" }), "cable-unplugged"],
    ["open classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "open" }), "session-stale"],
    ["reset classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "reset" }), "session-stale"],
    ["setup-config classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "setup-config" }), "session-stale"],
    ["endpoint-discovery classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "endpoint-discovery" }), "session-stale"],
    ["PtpStall without stage classifies camera-off", new LatentError("PtpStall", "x"), "camera-off"],
    ["PtpTimeout without stage classifies camera-off", new LatentError("PtpTimeout", "x"), "camera-off"],
    ["UsbPermissionDenied classifies permission-denied", new LatentError("UsbPermissionDenied", "x"), "permission-denied"],
    ["WebUSBSecureContextRequired classifies secure-context", new LatentError("WebUSBSecureContextRequired", "x"), "secure-context"],
    ["WebUSBUnsupported classifies webusb-unsupported", new LatentError("WebUSBUnsupported", "x"), "webusb-unsupported"],
  ] as const)("%s", (_name, err, expected) => {
    expect(classifyDriverError(err)).toBe(expected);
  });
});
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- state-machine.test.ts
```

Expected FAIL:

```text
FAIL  packages/camera-connection/tests/state-machine.test.ts
Error: Failed to resolve import "../src/classifier.js"
```

- [ ] Create `packages/camera-connection/src/classifier.ts`:

```ts
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
```

- [ ] Export it from `packages/camera-connection/src/index.ts`:

```ts
export { classifyDriverError } from "./classifier.js";
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- state-machine.test.ts
```

Expected PASS for classifier tests:

```text
PASS  packages/camera-connection/tests/state-machine.test.ts
```

**TDD cycle 5.2 — reducer transition coverage, 12 tests**

Test names:

- `idle CONNECT_REQUESTED enters connecting attempt 1`
- `idle AUTOCONNECT_AT_BOOT enters connecting attempt 1`
- `connecting connect success enters connected`
- `connecting fresh OPERATION_FAILED enters error`
- `connecting stale OPERATION_FAILED is ignored`
- `connecting DISCONNECT_REQUESTED enters disconnected`
- `connected USB_DEVICE_DISCONNECTED enters reconnecting`
- `connected PAGE_HIDING stays connected`
- `error RETRY_REQUESTED enters connecting`
- `error USB_DEVICE_CONNECTED enters connecting for cable-unplugged`
- `error USB_DEVICE_CONNECTED is skipped for macos-claim-collision`
- `disconnected CONNECT_REQUESTED enters connecting`

- [ ] Add reducer tests to `state-machine.test.ts`:

```ts
import {
  initialConnectionState,
  transition,
  type ConnectionContext,
  type ConnectionEvent,
} from "../src/state-machine.js";

function ctx(): ConnectionContext {
  return { currentOpId: 1 };
}

const err = new LatentError("UsbDisconnect", "gone", undefined, { stage: "transfer-in" });

describe("connection reducer transitions", () => {
  it("idle CONNECT_REQUESTED enters connecting attempt 1", () => {
    const next = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx());
    expect(next.state.kind).toBe("connecting");
    expect(next.state.kind === "connecting" ? next.state.attempt : 0).toBe(1);
  });

  it("idle AUTOCONNECT_AT_BOOT enters connecting attempt 1", () => {
    const next = transition(initialConnectionState, { type: "AUTOCONNECT_AT_BOOT" }, ctx());
    expect(next.state.kind).toBe("connecting");
  });

  it("connecting fresh OPERATION_FAILED enters error", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    const next = transition(state, { type: "OPERATION_FAILED", err, opId: 1 }, ctx());
    expect(next.state).toMatchObject({ kind: "error", reason: "cable-unplugged" });
  });

  it("connecting stale OPERATION_FAILED is ignored", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    const next = transition(state, { type: "OPERATION_FAILED", err, opId: 0 }, ctx());
    expect(next.state).toBe(state);
  });

  it("connecting DISCONNECT_REQUESTED enters disconnected", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    const next = transition(state, { type: "DISCONNECT_REQUESTED" }, ctx());
    expect(next.state.kind).toBe("disconnected");
  });

  it.each([
    ["connected USB_DEVICE_DISCONNECTED enters reconnecting", { type: "USB_DEVICE_DISCONNECTED" } as ConnectionEvent, "reconnecting"],
    ["connected PAGE_HIDING stays connected", { type: "PAGE_HIDING" } as ConnectionEvent, "connected"],
  ])("%s", (_name, event, expected) => {
    const state = fakeConnectedState();
    expect(transition(state, event, ctx()).state.kind).toBe(expected);
  });

  it("error RETRY_REQUESTED enters connecting", () => {
    const state = fakeErrorState("session-stale");
    expect(transition(state, { type: "RETRY_REQUESTED" }, ctx()).state.kind).toBe("connecting");
  });

  it("error USB_DEVICE_CONNECTED enters connecting for cable-unplugged", () => {
    const state = fakeErrorState("cable-unplugged");
    expect(transition(state, { type: "USB_DEVICE_CONNECTED" }, ctx()).state.kind).toBe("connecting");
  });

  it("error USB_DEVICE_CONNECTED is skipped for macos-claim-collision", () => {
    const state = fakeErrorState("macos-claim-collision");
    expect(transition(state, { type: "USB_DEVICE_CONNECTED" }, ctx()).state).toBe(state);
  });

  it("disconnected CONNECT_REQUESTED enters connecting", () => {
    expect(
      transition({ kind: "disconnected" }, { type: "CONNECT_REQUESTED" }, ctx()).state.kind,
    ).toBe("connecting");
  });
});
```

- [ ] Add local fake state helpers in the same test file:

```ts
function fakeConnectedState(): ConnectionState {
  return {
    kind: "connected",
    port: {
      getDeviceInfo: vi.fn(),
      getDevicePropValue: vi.fn(),
      setDevicePropValue: vi.fn(),
      isOpen: vi.fn(() => true),
    },
    cameraModel: "X-S20",
    firmwareVersion: "1.10",
  };
}

function fakeErrorState(reason: ErrorReason): ConnectionState {
  return {
    kind: "error",
    reason,
    underlying: err,
    isPhysicallyRecoverable: true,
  };
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- state-machine.test.ts
```

Expected FAIL:

```text
FAIL  packages/camera-connection/tests/state-machine.test.ts
Error: Failed to resolve import "../src/state-machine.js"
```

- [ ] Create `packages/camera-connection/src/state-machine.ts` with reducer types and pure transitions:

```ts
import type { LatentError } from "@latent/ptp-fuji";
import { classifyDriverError } from "./classifier.js";
import type { ConnectionState, ErrorReason } from "./types.js";

export type ConnectionEvent =
  | { type: "CONNECT_REQUESTED" }
  | { type: "AUTOCONNECT_AT_BOOT" }
  | { type: "DISCONNECT_REQUESTED" }
  | { type: "USB_DEVICE_DISCONNECTED" }
  | { type: "USB_DEVICE_CONNECTED" }
  | { type: "OPERATION_FAILED"; err: LatentError; opId: number }
  | { type: "OPERATION_SUCCEEDED"; opId: number }
  | { type: "PROBE_RESULT"; ok: boolean; err: LatentError; opId: number }
  | { type: "RETRY_REQUESTED" }
  | { type: "MACOS_SETUP_ATTEMPTED"; advanced: boolean }
  | { type: "PAGE_HIDING" };

export interface ConnectionContext {
  currentOpId: number;
}

export interface TransitionResult {
  state: ConnectionState;
}

export const initialConnectionState: ConnectionState = { kind: "idle" };

export function transition(
  state: ConnectionState,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  switch (state.kind) {
    case "idle":
      if (event.type === "CONNECT_REQUESTED" || event.type === "AUTOCONNECT_AT_BOOT") {
        return { state: connectingState(1) };
      }
      return { state };

    case "connecting":
      if (event.type === "DISCONNECT_REQUESTED") return { state: { kind: "disconnected" } };
      if (event.type === "USB_DEVICE_DISCONNECTED") {
        return { state: toError("cable-unplugged", new LatentError("UsbDisconnect", "USB device disconnected")) };
      }
      if (event.type === "OPERATION_FAILED") {
        if (event.opId !== context.currentOpId) return { state };
        return { state: toError(classifyDriverError(event.err), event.err) };
      }
      return { state };

    case "connected":
      if (event.type === "USB_DEVICE_DISCONNECTED") {
        return { state: reconnectingState(1, "cable-unplugged", new LatentError("UsbDisconnect", "USB device disconnected")) };
      }
      if (event.type === "PAGE_HIDING") return { state };
      if (event.type === "DISCONNECT_REQUESTED") return { state: { kind: "disconnected" } };
      return { state };

    case "degraded":
      return reduceDegraded(state, event, context);

    case "reconnecting":
      return reduceReconnecting(state, event, context);

    case "error":
      return reduceError(state, event);

    case "disconnected":
      if (event.type === "CONNECT_REQUESTED" || event.type === "USB_DEVICE_CONNECTED") {
        return { state: connectingState(1) };
      }
      return { state };
  }
}

function connectingState(
  attempt: number,
  macosSetupPending?: "basic" | "advanced",
): ConnectionState {
  return {
    kind: "connecting",
    attempt,
    abort: new AbortController(),
    ...(macosSetupPending ? { macosSetupPending } : {}),
  };
}

function reconnectingState(
  attempt: number,
  lastReason: ErrorReason,
  lastFailure: LatentError,
): ConnectionState {
  return {
    kind: "reconnecting",
    attempt,
    lastReason,
    lastFailure,
    backoffTimer: setTimeout(() => undefined, 0),
    abort: new AbortController(),
  };
}

function toError(reason: ErrorReason, underlying: LatentError): ConnectionState {
  return {
    kind: "error",
    reason,
    underlying,
    isPhysicallyRecoverable: !["secure-context", "webusb-unsupported"].includes(reason),
  };
}

function reduceError(state: Extract<ConnectionState, { kind: "error" }>, event: ConnectionEvent): TransitionResult {
  if (event.type === "RETRY_REQUESTED") return { state: connectingState(1) };
  if (event.type === "MACOS_SETUP_ATTEMPTED") {
    return { state: connectingState(1, event.advanced ? "advanced" : "basic") };
  }
  if (event.type === "USB_DEVICE_CONNECTED") {
    if (["macos-claim-collision", "secure-context", "webusb-unsupported"].includes(state.reason)) {
      return { state };
    }
    return { state: connectingState(1) };
  }
  if (event.type === "DISCONNECT_REQUESTED") return { state: { kind: "disconnected" } };
  return { state };
}
```

- [ ] Export it from `index.ts`:

```ts
export {
  initialConnectionState,
  transition,
  type ConnectionContext,
  type ConnectionEvent,
  type TransitionResult,
} from "./state-machine.js";
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- state-machine.test.ts
```

Expected PASS for the first 26 tests:

```text
PASS  packages/camera-connection/tests/state-machine.test.ts
```

**TDD cycle 5.3 — degraded, probe, backoff, listener, and stale cleanup semantics, 16 tests**

Test names:

- `connected probe ok enters degraded with one soft failure`
- `connected probe fail enters reconnecting`
- `degraded operation success returns connected`
- `degraded probe ok increments soft failure from 1 to 2`
- `degraded third soft failure escalates to reconnecting`
- `degraded probe fail escalates immediately`
- `degraded USB disconnect enters reconnecting`
- `reconnecting operation failure retries attempt 2`
- `reconnecting operation failure retries attempt 3`
- `reconnecting third failure enters error`
- `reconnecting USB connect skips backoff and enters connecting`
- `reconnecting disconnect enters disconnected`
- `stale OPERATION_SUCCEEDED is ignored`
- `macOS setup basic enters connecting with pending basic`
- `macOS setup advanced enters connecting with pending advanced`
- `backoff delays are 200, 800, and 2000 ms`

- [ ] Extend tests with the names above. For timer checks, use:

```ts
it("backoff delays are 200, 800, and 2000 ms", () => {
  vi.useFakeTimers();
  const first = makeReconnectingState(1);
  const second = makeReconnectingState(2);
  const third = makeReconnectingState(3);
  expect(backoffDelayMs(first.attempt)).toBe(200);
  expect(backoffDelayMs(second.attempt)).toBe(800);
  expect(backoffDelayMs(third.attempt)).toBe(2000);
  vi.useRealTimers();
});
```

- [ ] Add reducer support for `PROBE_RESULT`, `OPERATION_SUCCEEDED`, reconnect attempts, and `backoffDelayMs`. Use these function bodies:

```ts
export function backoffDelayMs(attempt: number): number {
  if (attempt === 1) return 200;
  if (attempt === 2) return 800;
  return 2000;
}

function reduceDegraded(
  state: Extract<ConnectionState, { kind: "degraded" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "DISCONNECT_REQUESTED") return { state: { kind: "disconnected" } };
  if (event.type === "USB_DEVICE_DISCONNECTED") {
    return { state: reconnectingState(1, "cable-unplugged", eventFailure()) };
  }
  if (event.type === "PAGE_HIDING") return { state };
  if (event.type === "OPERATION_SUCCEEDED") {
    if (event.opId !== context.currentOpId) return { state };
    return {
      state: {
        kind: "connected",
        port: state.port,
        cameraModel: state.cameraModel,
        firmwareVersion: state.firmwareVersion,
      },
    };
  }
  if (event.type === "PROBE_RESULT") {
    if (event.opId !== context.currentOpId) return { state };
    if (!event.ok) {
      return { state: reconnectingState(1, classifyDriverError(event.err), event.err) };
    }
    if (state.consecutiveSoftFailures >= 2) {
      return { state: reconnectingState(1, classifyDriverError(event.err), event.err) };
    }
    return {
      state: {
        ...state,
        consecutiveSoftFailures: state.consecutiveSoftFailures + 1,
        lastFailure: event.err,
      },
    };
  }
  return { state };
}

function reduceReconnecting(
  state: Extract<ConnectionState, { kind: "reconnecting" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "DISCONNECT_REQUESTED") return { state: { kind: "disconnected" } };
  if (event.type === "USB_DEVICE_CONNECTED") return { state: connectingState(1) };
  if (event.type === "OPERATION_FAILED") {
    if (event.opId !== context.currentOpId) return { state };
    if (state.attempt >= 3) return { state: toError(classifyDriverError(event.err), event.err) };
    return { state: reconnectingState(state.attempt + 1, classifyDriverError(event.err), event.err) };
  }
  return { state };
}

function eventFailure(): LatentError {
  return new LatentError("UsbDisconnect", "USB device disconnected");
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- state-machine.test.ts
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/state-machine.test.ts
```

- [ ] Confirm the file contains at least 42 tests:

```sh
rg -n "it\\(" packages/camera-connection/tests/state-machine.test.ts
```

Expected output includes at least 42 matching lines.

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection
npm run typecheck --workspace=@latent/camera-connection
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/state-machine.test.ts
```

- [ ] Commit:

```sh
git add packages/camera-connection/src/state-machine.ts packages/camera-connection/src/classifier.ts packages/camera-connection/src/index.ts packages/camera-connection/tests/state-machine.test.ts
git commit -m $'feat: add camera connection state machine\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 6 — Step 6: `WebUsbCameraDriver` and `WebUsbSessionPort`

**Files**

- Create: `packages/camera-connection/src/drivers/webusb.ts`, `packages/camera-connection/tests/fakes.ts`, `packages/camera-connection/tests/webusb-driver.test.ts`
- Modify: `packages/camera-connection/src/index.ts`, `packages/ptp-fuji-webusb/src/request-camera.ts` if helper exports are required
- Test: `packages/camera-connection/tests/webusb-driver.test.ts`

**TDD cycle 6.1 — fakes and connect paths, 6 tests**

Test names:

- `connect uses paired device when autoSelectPaired is true`
- `connect falls back to picker when no paired device exists`
- `connect aborts before claim`
- `connect aborts during OpenSession`
- `connect returns deviceInfo and usbSerialNumber`
- `WebUsbSessionPort reports isOpen from FujiCameraSession state`

- [ ] Create `packages/camera-connection/tests/fakes.ts` with:

```ts
import { vi } from "vitest";
import type { CameraDriver, DriverConnectResult } from "../src/driver.js";
import type { CameraSessionPort, DeviceInfo, DeviceValue } from "../src/session-port.js";

export class FakeSessionPort implements CameraSessionPort {
  open = true;
  deviceInfo: DeviceInfo = {
    model: "X-S20",
    firmwareVersion: "1.10",
    serialNumber: "PTP-123",
    supportedOps: [0x1001, 0x1002, 0x1003, 0x1015, 0x1016],
  };

  getDeviceInfo = vi.fn(async () => this.deviceInfo);
  getDevicePropValue = vi.fn(async (_code: number): Promise<DeviceValue> => ({ kind: "uint16", value: 1 }));
  setDevicePropValue = vi.fn(async () => undefined);
  isOpen = vi.fn(() => this.open);
}

export class FakeCameraDriver implements CameraDriver {
  port = new FakeSessionPort();
  connectCalls: Array<{ signal?: AbortSignal; autoSelectPaired?: boolean }> = [];
  disconnect = vi.fn(async () => undefined);
  fireCloseSession = vi.fn(() => undefined);
  probe = vi.fn(async () => true);
  private disconnectHandlers = new Set<() => void>();
  private connectHandlers = new Set<() => void>();

  async connect(opts: { autoSelectPaired?: boolean; signal?: AbortSignal } = {}): Promise<DriverConnectResult> {
    this.connectCalls.push(opts);
    return {
      port: this.port,
      deviceInfo: this.port.deviceInfo,
      usbSerialNumber: "USB-123",
      dispose: vi.fn(async () => {
        this.port.open = false;
      }),
    };
  }

  subscribeDisconnectEvents(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  subscribeConnectEvents(handler: () => void): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  emitDisconnect(): void {
    for (const handler of this.disconnectHandlers) handler();
  }

  emitConnect(): void {
    for (const handler of this.connectHandlers) handler();
  }
}

export class FakeUSBDevice extends EventTarget {
  vendorId = 0x04cb;
  productId = 0x02de;
  serialNumber?: string = "USB-123";
  opened = false;
  configuration: USBConfiguration | null = null;
  open = vi.fn(async () => {
    this.opened = true;
  });
  close = vi.fn(async () => {
    this.opened = false;
  });
  selectConfiguration = vi.fn(async () => {
    this.configuration = {
      configurationValue: 1,
      interfaces: [],
    } as unknown as USBConfiguration;
  });
  claimInterface = vi.fn(async () => undefined);
  releaseInterface = vi.fn(async () => undefined);
  reset = vi.fn(async () => undefined);
  transferIn = vi.fn(async () => ({ status: "ok", data: new DataView(new ArrayBuffer(0)) }));
  transferOut = vi.fn(async () => ({ status: "ok", bytesWritten: 0 }));
}
```

- [ ] Create `packages/camera-connection/tests/webusb-driver.test.ts` with the six connect tests listed above. Mock `@latent/ptp-fuji-webusb` and `@latent/ptp-fuji` constructors with `vi.mock`.

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- webusb-driver.test.ts
```

Expected FAIL:

```text
FAIL  packages/camera-connection/tests/webusb-driver.test.ts
Error: Failed to resolve import "../src/drivers/webusb.js"
```

- [ ] Create `packages/camera-connection/src/drivers/webusb.ts` with `WebUsbCameraDriver`, `WebUsbSessionPort`, `claimWithReset`, `openSessionWithStaging`, and event subscription exports. Keep helpers exported for direct tests:

```ts
export class WebUsbSessionPort implements CameraSessionPort {
  constructor(private readonly session: FujiCameraSession) {}

  async getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo> {
    return this.session.getDeviceInfo(signal);
  }

  async getDevicePropValue(_code: number, _signal?: AbortSignal): Promise<DeviceValue> {
    throw new LatentError("PtpUnsupportedOperation", "GetDevicePropValue is not wired yet");
  }

  async setDevicePropValue(_code: number, _value: DeviceValue, _signal?: AbortSignal): Promise<void> {
    throw new LatentError("PtpUnsupportedOperation", "SetDevicePropValue is not wired yet");
  }

  isOpen(): boolean {
    return this.session.state === "open";
  }
}
```

- [ ] Implement `connect()` so it returns:

```ts
return {
  port,
  deviceInfo,
  usbSerialNumber: device.serialNumber,
  dispose: async () => {
    try {
      await session.close();
    } catch {
      try {
        await transport.close();
      } catch {
        // dispose is best-effort
      }
    }
  },
};
```

- [ ] Export from `index.ts`:

```ts
export { WebUsbCameraDriver, WebUsbSessionPort } from "./drivers/webusb.js";
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- webusb-driver.test.ts
```

Expected PASS for the first six tests:

```text
PASS  packages/camera-connection/tests/webusb-driver.test.ts
```

**TDD cycle 6.2 — guarded claim with reset, 7 tests**

Test names:

- `claimWithReset succeeds first try without reset`
- `claimWithReset does not reset when failure is not claim collision`
- `claimWithReset wraps reset failure with stage reset`
- `claimWithReset wraps reconfiguration failure with stage setup-config`
- `claimWithReset wraps endpoint discovery failure with stage endpoint-discovery`
- `claimWithReset wraps second claim failure with stage claim`
- `claimWithReset reclaims after reset and endpoint rediscovery`

- [ ] Add direct tests for exported `claimWithReset`.
- [ ] Run the test file and expect the missing helper or missing branch assertion to fail.
- [ ] Implement `isClaimCollision`, guarded `device.reset()`, reselect configuration, endpoint rediscovery, and second claim wrapping exactly to the spec's §7.3 flow.
- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- webusb-driver.test.ts
```

Expected PASS includes:

```text
PASS  packages/camera-connection/tests/webusb-driver.test.ts
```

**TDD cycle 6.3 — OpenSession staging and cleanup, 6 tests**

Test names:

- `openSessionWithStaging rewraps LatentError as stage open`
- `openSessionWithStaging wraps non-LatentError as stage open`
- `disconnect sends CloseSession before releasing interface`
- `disconnect is idempotent`
- `disconnect swallows close errors`
- `DriverConnectResult.dispose closes only its own port`

- [ ] Add tests for exported `openSessionWithStaging`, `disconnect()`, and two concurrent connect results where stale `dispose()` is called after a newer connect.
- [ ] Run and expect `stage` to be undefined or `dispose` to close the active object.
- [ ] Implement separate internal tracking for the active result and per-result cleanup. `dispose()` must close only the `session` and `transport` captured in its closure. `disconnect()` may close only `this.activeResult`.
- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- webusb-driver.test.ts
```

Expected PASS.

**TDD cycle 6.4 — event filters, probe, and fire-close, 8 tests**

Test names:

- `connect event ignores vendor mismatch`
- `connect event ignores product mismatch`
- `connect event ignores USB serial mismatch`
- `connect event ignores permission revoked`
- `connect event fires for a new USBDevice instance with matching descriptors`
- `probe returns true when GetDeviceInfo succeeds`
- `probe returns false on timeout, stall, or closed port`
- `fireCloseSession returns synchronously and swallows send rejection`

- [ ] Add tests using `FakeUSBDevice` and fake `navigator.usb.getDevices()`.
- [ ] Run and expect filter tests to fail because event subscription is not implemented.
- [ ] Implement `subscribeConnectEvents`, `subscribeDisconnectEvents`, `probe`, and `fireCloseSession`.
- [ ] Confirm the file contains at least 27 tests:

```sh
rg -n "it\\(" packages/camera-connection/tests/webusb-driver.test.ts
```

Expected output includes at least 27 matching lines.

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- webusb-driver.test.ts
npm run typecheck --workspace=@latent/camera-connection
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/webusb-driver.test.ts
```

- [ ] Commit:

```sh
git add packages/camera-connection/src/drivers/webusb.ts packages/camera-connection/src/index.ts packages/camera-connection/tests/fakes.ts packages/camera-connection/tests/webusb-driver.test.ts
git commit -m $'feat: add webusb camera driver\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 7 — Step 7: `ConnectionManager`

**Files**

- Create: `packages/camera-connection/src/manager.ts`, `packages/camera-connection/tests/manager.test.ts`
- Modify: `packages/camera-connection/src/index.ts`
- Test: `packages/camera-connection/tests/manager.test.ts`

**TDD cycle 7.1 — public API and basic connection, 5 tests**

Test names:

- `subscribe receives initial state on first commit`
- `CONNECT_REQUESTED calls driver.connect with autoSelectPaired true`
- `connect success commits connected`
- `DISCONNECT_REQUESTED calls driver.disconnect`
- `start dispatches AUTOCONNECT_AT_BOOT when paired callback returns true`

- [ ] Create `packages/camera-connection/tests/manager.test.ts` with manager construction using `FakeCameraDriver`.
- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- manager.test.ts
```

Expected FAIL:

```text
FAIL  packages/camera-connection/tests/manager.test.ts
Error: Failed to resolve import "../src/manager.js"
```

- [ ] Create `packages/camera-connection/src/manager.ts` with:

```ts
export type ManagerNotifications = {
  "setup-confirmed": { advanced: boolean };
  "presets-read": { presets: RawPreset[] };
};

export interface RawPreset {
  slot: number;
  name?: string;
  properties: Record<string, unknown>;
}
```

- [ ] Implement `ConnectionManager` with `subscribe`, `onNotification`, `start`, `dispatch`, a private `commit()` method, and a private `state: ConnectionState = initialConnectionState`.
- [ ] Export from `index.ts`:

```ts
export { ConnectionManager, type ManagerNotifications, type RawPreset } from "./manager.js";
```

- [ ] Run and expect the first five tests to pass.

**TDD cycle 7.2 — opId, abort, stale completion, and dispose, 5 tests**

Test names:

- `disconnect while connecting aborts in-flight connect`
- `late connect success after disconnect calls result.dispose`
- `late connect failure after disconnect is ignored`
- `fresh connect after stale success is not closed by stale dispose`
- `stale OPERATION_FAILED does not overwrite connected state`

- [ ] Add deferred-promise tests to `manager.test.ts`.
- [ ] Run and expect stale dispose assertions to fail.
- [ ] Implement monotonic `currentGeneration`, per-connect `opId`, and stale result handling:

```ts
if (opId !== this.currentGeneration || this.state.kind !== "connecting") {
  await result.dispose();
  return;
}
```

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- manager.test.ts
```

Expected PASS for 10 tests.

**TDD cycle 7.3 — listener lifecycle and page unload, 5 tests**

Test names:

- `connected installs USB and page listeners once`
- `connected to degraded preserves listeners`
- `degraded to reconnecting preserves listeners`
- `alive to error uninstalls listeners once`
- `pagehide and beforeunload call driver.fireCloseSession`

- [ ] Add tests around unsubscribe callbacks returned by `FakeCameraDriver`.
- [ ] Run and expect listener count assertions to fail.
- [ ] Implement connection-generation-owned listener handles. Install only on fresh `connecting` to `connected`. Uninstall only when leaving alive set to `error` or `disconnected`.
- [ ] Run and expect PASS.

**TDD cycle 7.4 — probe, degraded, reconnect backoff, and notifications, 7 tests**

Test names:

- `operation failure in connected probes before state change`
- `probe ok moves connected to degraded`
- `probe fail moves connected to reconnecting`
- `third soft failure escalates from degraded to reconnecting`
- `reconnect backoff retries at 200, 800, then 2000 ms`
- `setup-confirmed notification fires after state subscribers`
- `setup-confirmed notification is dropped when no subscriber exists`

- [ ] Add tests with `vi.useFakeTimers()` and ordered arrays for callback order.
- [ ] Run and expect notification order to fail until implemented.
- [ ] Implement notification queue in `commit()`:

```ts
private commit(next: ConnectionState, notifications: QueuedNotification[] = []): void {
  this.state = next;
  for (const subscriber of this.stateSubscribers) subscriber(next);
  for (const notification of notifications) this.emitNotification(notification);
}
```

- [ ] Ensure `connecting{macosSetupPending}` to `connected` enqueues:

```ts
{ type: "setup-confirmed", payload: { advanced: previous.macosSetupPending === "advanced" } }
```

- [ ] Confirm at least 22 tests exist:

```sh
rg -n "it\\(" packages/camera-connection/tests/manager.test.ts
```

Expected output includes at least 22 matching lines.

- [ ] Run:

```sh
npm run test --workspace=@latent/camera-connection -- manager.test.ts
npm run test --workspace=@latent/camera-connection
npm run typecheck --workspace=@latent/camera-connection
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/manager.test.ts
PASS  packages/camera-connection/tests/state-machine.test.ts
PASS  packages/camera-connection/tests/webusb-driver.test.ts
```

- [ ] Commit:

```sh
git add packages/camera-connection/src/manager.ts packages/camera-connection/src/index.ts packages/camera-connection/tests/manager.test.ts
git commit -m $'feat: add camera connection manager\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 8 — Step 8: Replace store and UI components

**Files**

- Create: `apps/web/src/components/camera/CameraConnect.tsx`, `apps/web/src/components/camera/ConnectButton.tsx`, `apps/web/src/components/camera/ConnectingIndicator.tsx`, `apps/web/src/components/camera/ConnectedBadge.tsx`, `apps/web/src/components/camera/DegradedBanner.tsx`, `apps/web/src/components/camera/ErrorBanner.tsx`, `apps/web/tests/camera-connection.test.tsx`
- Modify: `apps/web/src/components/CameraConnect.tsx`, `apps/web/src/stores/camera.ts`, `apps/web/src/i18n/en.ts`, `apps/web/src/i18n/it.ts`, `apps/web/package.json`
- Test: `apps/web/tests/camera-connection.test.tsx`

**TDD cycle 8.1 — store wiring to manager, 6 tests**

Test names:

- `connect dispatches CONNECT_REQUESTED`
- `disconnect dispatches DISCONNECT_REQUESTED`
- `retry dispatches RETRY_REQUESTED`
- `state subscriber mirrors manager state`
- `setup-confirmed basic sets only macosSetupAcknowledged`
- `setup-confirmed advanced sets both macOS setup flags`

- [ ] Add `@latent/camera-connection` to `apps/web/package.json` dependencies:

```json
"@latent/camera-connection": "0.0.0"
```

- [ ] Create `apps/web/tests/camera-connection.test.tsx` with the six store tests. Use a fake manager object with `subscribe`, `onNotification`, `start`, and `dispatch` spies.
- [ ] Run:

```sh
npm run test --workspace=@latent/web -- camera-connection.test.tsx
```

Expected FAIL:

```text
FAIL  apps/web/tests/camera-connection.test.tsx
AssertionError: expected "spy" to be called with arguments: [ { type: 'CONNECT_REQUESTED' } ]
```

- [ ] Refactor `apps/web/src/stores/camera.ts` to store:

```ts
state: ConnectionState;
presets: RawPreset[];
macosBetaAcknowledged: boolean;
macosSetupAcknowledged: boolean;
macosPersistentDisableConfigured: boolean;
macosWizardOpen: boolean;
macosShowAdvanced: boolean;
connect: () => void;
disconnect: () => void;
retry: () => void;
acknowledgeMacosSetup: () => void;
markMacosPersistentDisable: () => void;
resetMacosSetupStatus: () => void;
```

- [ ] Add a `wireCameraManager(manager: ConnectionManager): void` function that subscribes in this order: state subscriber, `setup-confirmed`, `presets-read`, then `manager.start()`.
- [ ] Run and expect PASS for the six store tests.

**TDD cycle 8.2 — store-side persistent flag reset, 3 tests**

Test names:

- `macos claim collision with persistent flag resets both setup flags`
- `macos claim collision without persistent flag keeps setup acknowledgement`
- `non-mac error does not reset macOS setup flags`

- [ ] Add the three tests.
- [ ] Implement the store-side reaction inside the state subscriber:

```ts
if (
  state.kind === "error" &&
  state.reason === "macos-claim-collision" &&
  useCameraStore.getState().macosPersistentDisableConfigured
) {
  useCameraStore.getState().resetMacosSetupStatus();
}
```

- [ ] Run and expect PASS.

**TDD cycle 8.3 — component split and error copy, 9 tests**

Test names:

- `idle renders ConnectButton`
- `connecting renders ConnectingIndicator with attempt`
- `reconnecting renders ConnectingIndicator with attempt`
- `connected renders ConnectedBadge`
- `degraded renders ConnectedBadge and DegradedBanner`
- `error renders ErrorBanner`
- `ErrorBanner renders all 8 ErrorReason titles`
- `cable-unplugged title is Camera unplugged`
- `CameraConnect legacy export delegates to new component`

- [ ] Create the seven component files listed for this task.
- [ ] Replace `apps/web/src/components/CameraConnect.tsx` with a compatibility re-export:

```ts
export { CameraConnect } from "./camera/CameraConnect";
```

- [ ] Add i18n keys in `apps/web/src/i18n/en.ts` and `apps/web/src/i18n/it.ts` under `camera.error.<reason>.{title,body,action}`. Use the exact English copy from spec §8.4 and faithful Italian translations.
- [ ] Run:

```sh
npm run test --workspace=@latent/web -- camera-connection.test.tsx
```

Expected FAIL until components are wired:

```text
FAIL  apps/web/tests/camera-connection.test.tsx > camera connection UI > error renders ErrorBanner
TestingLibraryElementError: Unable to find an element
```

- [ ] Implement `CameraConnect.tsx` as a pure switch on `state.kind`, with no direct driver calls.
- [ ] Run and expect all 18 tests in this file to pass.

- [ ] Run:

```sh
npm run test --workspace=@latent/web
npm run typecheck --workspace=@latent/web
```

Expected PASS:

```text
PASS  apps/web/tests/camera-connection.test.tsx
PASS  apps/web/tests/stores/recipes.test.ts
```

- [ ] Commit:

```sh
git add apps/web/package.json apps/web/src/stores/camera.ts apps/web/src/components/CameraConnect.tsx apps/web/src/components/camera apps/web/src/i18n/en.ts apps/web/src/i18n/it.ts apps/web/tests/camera-connection.test.tsx
git commit -m $'feat: wire web camera connection state\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 9 — Step 9: macOS beta warning and setup wizard

**Files**

- Create: `apps/web/src/components/camera/MacosBetaWarning.tsx`, `apps/web/src/components/camera/MacosSetupWizard.tsx`, `apps/web/tests/macos-setup-wizard.test.tsx`
- Modify: `apps/web/src/components/camera/ErrorBanner.tsx`, `apps/web/src/components/camera/CameraConnect.tsx`, `apps/web/src/stores/camera.ts`, `apps/web/src/i18n/en.ts`, `apps/web/src/i18n/it.ts`
- Test: `apps/web/tests/macos-setup-wizard.test.tsx`

**TDD cycle 9.1 — wizard gating and basic path, 4 tests**

Test names:

- `first macos claim collision shows beta warning`
- `acknowledging beta persists macosBetaAcknowledged`
- `basic wizard click dispatches MACOS_SETUP_ATTEMPTED advanced false`
- `basic reconnect failure leaves both setup flags false`

- [ ] Create `apps/web/tests/macos-setup-wizard.test.tsx` with these tests using React Testing Library and a fake store manager dispatch spy.
- [ ] Run:

```sh
npm run test --workspace=@latent/web -- macos-setup-wizard.test.tsx
```

Expected FAIL:

```text
FAIL  apps/web/tests/macos-setup-wizard.test.tsx
Error: Failed to resolve import "../src/components/camera/MacosSetupWizard"
```

- [ ] Implement `MacosBetaWarning.tsx` and `MacosSetupWizard.tsx`. The basic step must render this command exactly:

```text
killall ptpcamerad
```

- [ ] The basic "I've run it" action dispatches:

```ts
{ type: "MACOS_SETUP_ATTEMPTED", advanced: false }
```

- [ ] Run and expect the four tests to pass.

**TDD cycle 9.2 — advanced path, reset, and repeat collision, 5 tests**

Test names:

- `failed basic path reveals Show advanced option`
- `advanced wizard renders disable and enable commands`
- `advanced click dispatches MACOS_SETUP_ATTEMPTED advanced true`
- `setup-confirmed advanced sets persistent flag`
- `success step reset action clears both macOS setup flags`

- [ ] Add the five tests.
- [ ] Implement advanced reveal, advanced command copy, re-enable command copy, and reset button.
- [ ] The advanced command must be:

```text
launchctl disable gui/$(id -u)/com.apple.ptpcamerad && killall ptpcamerad
```

- [ ] The re-enable command must be:

```text
launchctl enable gui/$(id -u)/com.apple.ptpcamerad
```

- [ ] Run:

```sh
npm run test --workspace=@latent/web -- macos-setup-wizard.test.tsx
```

Expected PASS:

```text
PASS  apps/web/tests/macos-setup-wizard.test.tsx
```

- [ ] Confirm at least 9 wizard tests exist:

```sh
rg -n "it\\(" apps/web/tests/macos-setup-wizard.test.tsx
```

Expected output includes at least 9 matching lines.

- [ ] Run:

```sh
npm run test --workspace=@latent/web
npm run typecheck --workspace=@latent/web
```

Expected PASS:

```text
PASS  apps/web/tests/macos-setup-wizard.test.tsx
PASS  apps/web/tests/camera-connection.test.tsx
```

- [ ] Commit:

```sh
git add apps/web/src/components/camera/MacosBetaWarning.tsx apps/web/src/components/camera/MacosSetupWizard.tsx apps/web/src/components/camera/ErrorBanner.tsx apps/web/src/components/camera/CameraConnect.tsx apps/web/src/stores/camera.ts apps/web/src/i18n/en.ts apps/web/src/i18n/it.ts apps/web/tests/macos-setup-wizard.test.tsx
git commit -m $'feat: add macos camera setup wizard\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 10 — Step 10: Hardware validation

**Files**

- Create: `docs/qa/hardware-test-plan.md`
- Modify: none
- Test: manual hardware checklist

**Documentation cycle 10.1 — checklist artifact**

- [ ] Create `docs/qa/hardware-test-plan.md` with this content:

```md
# Camera Connection Stability Hardware Test Plan

Device under test:

- Camera body:
- Firmware:
- Host OS:
- Browser:
- Latent commit:
- Tester:
- Date:

## Connection happy path

- [ ] Connect from idle opens WebUSB picker and reaches connected within 5 seconds.
- [ ] Refresh after connected reconnects within 2 seconds.
- [ ] Disconnect button closes the session and returns to disconnected.

## USB events

- [ ] Unplug while connected shows "Camera unplugged".
- [ ] Replug after unplug reconnects within 5 seconds.
- [ ] Replug with a new browser USBDevice object still triggers reconnect.

## Camera state and degraded

- [ ] Camera powered off while connected enters reconnecting or camera-off.
- [ ] Camera powered back on reconnects without a user click.
- [ ] Two soft operation failures show degraded state without disconnecting.
- [ ] Third consecutive soft failure escalates to reconnecting.
- [ ] Probe failure from degraded escalates immediately.

## macOS-specific

- [ ] With `ptpcamerad` active, claim collision shows macOS-specific copy.
- [ ] First macOS collision shows beta warning once.
- [ ] Basic `killall ptpcamerad` path sets only setup acknowledgement after reconnect.
- [ ] Advanced disable path sets persistent flag only after reconnect.
- [ ] Re-enabling `ptpcamerad` after persistent setup clears stale flags on the next collision.

## Edge environment

- [ ] In insecure context, secure-context error appears before device picker.
- [ ] In non-Chromium browser, unsupported-browser copy appears.
- [ ] Permission denial maps to permission-needed copy.
- [ ] Linux or Windows claim collision shows session-stale copy.

## Refresh and lifecycle

- [ ] `Cmd+R` while connected recovers without camera power-cycle.
- [ ] Tab close then reopen recovers without camera power-cycle.
- [ ] Navigation away and back recovers without camera power-cycle.
- [ ] Browser quit and restart recovers or surfaces session-stale with correct recovery copy.

## Wizard flow

- [ ] Failed basic setup reveals "Show advanced option".
- [ ] Success step shows re-enable command.
- [ ] Reset macOS setup status clears both persisted setup flags.

## Result table

| Item | Pass/Fail | Notes |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |
| 8 |  |  |
| 9 |  |  |
| 10 |  |  |
| 11 |  |  |
| 12 |  |  |
| 13 |  |  |
| 14 |  |  |
| 15 |  |  |
| 16 |  |  |
| 17 |  |  |
| 18 |  |  |
| 19 |  |  |
| 20 |  |  |
| 21 |  |  |
| 22 |  |  |
| 23 |  |  |
| 24 |  |  |
| 25 |  |  |
| 26 |  |  |
| 27 |  |  |
```

- [ ] Run the automated validation before hardware testing:

```sh
npm run validate
```

Expected PASS:

```text
npm run lockstep-check
```

- [ ] Run the 27 manual checks on X-S20. Record the values in the header and result table.
- [ ] If any item fails, file a bug with the failing checklist number, fix it in the owning task area, rerun `npm run validate`, and rerun the failed hardware item.
- [ ] Commit:

```sh
git add docs/qa/hardware-test-plan.md
git commit -m $'docs: add camera stability hardware test plan\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Task 11 — Step 11: Optional Homebrew formula

**Files**

- Create: `Formula/release-camera.rb` in the separate `formray/homebrew-latent` tap repository if the repository exists locally
- Modify: `apps/web/src/components/camera/MacosSetupWizard.tsx`, `apps/web/src/i18n/en.ts`, `apps/web/src/i18n/it.ts` only after formula publication
- Test: formula audit and wizard copy

**Optional release cycle 11.1 — formula and copy**

- [ ] In the tap repository, create `Formula/release-camera.rb`:

```rb
class ReleaseCamera < Formula
  desc "Release macOS ptpcamerad ownership of Fujifilm cameras for Latent"
  homepage "https://github.com/formray/latent"
  version "0.1.0"

  def install
    (bin/"release-camera").write <<~SH
      #!/bin/sh
      set -eu
      launchctl disable gui/$(id -u)/com.apple.ptpcamerad
      killall ptpcamerad 2>/dev/null || true
      echo "ptpcamerad disabled for this user. Re-enable with: launchctl enable gui/$(id -u)/com.apple.ptpcamerad"
    SH
  end

  test do
    assert_match "ptpcamerad", shell_output("#{bin}/release-camera 2>&1", 0)
  end
end
```

- [ ] Run in the tap repository:

```sh
brew audit --strict Formula/release-camera.rb
```

Expected PASS:

```text
release-camera
```

- [ ] After the tap is published, update wizard success copy to mention:

```text
brew install formray/latent/release-camera
```

- [ ] Add one web component test named:

```text
wizard success mentions Homebrew helper only after formula publication
```

- [ ] Run:

```sh
npm run test --workspace=@latent/web -- macos-setup-wizard.test.tsx
```

Expected PASS:

```text
PASS  apps/web/tests/macos-setup-wizard.test.tsx
```

- [ ] Commit in Latent only if wizard copy changed:

```sh
git add apps/web/src/components/camera/MacosSetupWizard.tsx apps/web/src/i18n/en.ts apps/web/src/i18n/it.ts apps/web/tests/macos-setup-wizard.test.tsx
git commit -m $'docs: mention macos camera release helper\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>'
```

---

## Final validation before merge

- [ ] Run:

```sh
npm run validate
```

Expected PASS:

```text
npm run typecheck
npm run lint
npm run test
npm run license-check
npm run lockstep-check
```

- [ ] Run package-specific checks:

```sh
npm run test --workspace=@latent/camera-connection
npm run typecheck --workspace=@latent/camera-connection
npm run lint --workspace=@latent/camera-connection
npm run test --workspace=@latent/ptp-fuji
npm run test --workspace=@latent/ptp-fuji-webusb
npm run test --workspace=@latent/web
```

Expected PASS:

```text
PASS  packages/camera-connection/tests/state-machine.test.ts
PASS  packages/camera-connection/tests/manager.test.ts
PASS  packages/camera-connection/tests/webusb-driver.test.ts
PASS  packages/ptp-fuji/tests/session.test.ts
PASS  packages/ptp-fuji-webusb/tests/webusb-transport.test.ts
PASS  apps/web/tests/camera-connection.test.tsx
PASS  apps/web/tests/macos-setup-wizard.test.tsx
```

---

## Self-review checklist

**Spec coverage sample**

- [ ] "The classifier reads structured fields, not message substrings" is covered by Task 5 cycle 5.1.
- [ ] "`DriverConnectResult.dispose()` closes only its own port" is covered by Task 6 cycle 6.3 and Task 7 cycle 7.2.
- [ ] "`MACOS_SETUP_CONFIRMED` is not a state-machine event" is covered by Task 7 cycle 7.4 and Task 8 cycle 8.1.
- [ ] "Notification subscriptions must be registered before `manager.start()`" is covered by Task 8 cycle 8.1.
- [ ] "Listener lifecycle is connection-generation-owned" is covered by Task 7 cycle 7.3.
- [ ] "Probe-fail in degraded escalates immediately" is covered by Task 5 cycle 5.3 and Task 7 cycle 7.4.
- [ ] "Linux/Windows generic claim collision maps to session-stale" is covered by Task 5 cycle 5.1 and Task 8 cycle 8.3.
- [ ] "The USB descriptor serial is distinct from PTP serial" is covered by Task 6 cycle 6.4.
- [ ] "Both macOS flags are gated on a real reconnect success" is covered by Task 8 cycle 8.1 and Task 9 cycle 9.2.
- [ ] "Hardware test plan has 27 items" is covered by Task 10.

**Placeholder scan**

- [ ] Run:

```sh
rg -n "TB[D]|TO[D]O|fill i[n]|implement late[r]|as appropriat[e]|similar t[o]" docs/superpowers/plans/2026-05-04-camera-connection-stability-plan.md
```

Expected output:

```text
```

**Type consistency**

- [ ] Confirm these exact names are used consistently: `CameraSessionPort`, `DriverConnectResult`, `dispose()`, `setup-confirmed`, `macosSetupPending`, `macosPersistentDisableConfigured`, `classifyDriverError`, `WebUsbCameraDriver`, `WebUsbSessionPort`.

**Test count tally**

- [ ] Step 0 supporting tests: 10 planned.
- [ ] Step 1a supporting tests: 10 planned.
- [ ] Step 1b supporting tests: 5 planned.
- [ ] Step 2 supporting tests: 6 planned.
- [ ] Step 5 state-machine and classifier tests: 42 planned.
- [ ] Step 6 driver tests: 27 planned.
- [ ] Step 7 manager tests: 22 planned.
- [ ] Step 8 web integration tests: 18 planned.
- [ ] Step 9 macOS wizard tests: 9 planned.

**Plan complete.** When you're ready to implement, switch to
superpowers:subagent-driven-development (recommended) or
superpowers:executing-plans.
