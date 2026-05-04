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
  domException?: string | undefined;
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
    if (metadata.stage !== undefined) {
      this.stage = metadata.stage;
    }
    if (metadata.domException !== undefined) {
      this.domException = metadata.domException;
    }
    if (metadata.platform !== undefined) {
      this.platform = metadata.platform;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
