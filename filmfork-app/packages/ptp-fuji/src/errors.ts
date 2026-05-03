/**
 * Typed error taxonomy for @filmfork/ptp-fuji and consumers.
 *
 * Categories per spec §6.9 (R5.1) — note `WebUSBSecureContextRequired`
 * was renamed from `WebUsbSecureContextRequired` for casing consistency
 * with the other WebUSB-prefixed members.
 */

export type FilmForkErrorCategory =
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

export class FilmForkError extends Error {
  readonly category: FilmForkErrorCategory;
  override readonly cause?: unknown;

  constructor(category: FilmForkErrorCategory, message: string, cause?: unknown) {
    super(message);
    this.name = "FilmForkError";
    this.category = category;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
