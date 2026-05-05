# @latent/ptp-fuji — protocol reference

Forked from filmkit. This document mirrors filmkit's `QUICK_REFERENCE.md` with
Latent-specific extensions called out: vendor opcodes for RAF upload,
typed error taxonomy mapping, transport contract.

## Vendor opcodes (RAF upload — distinct from standard PTP)

| Op                                | Purpose                      |
| --------------------------------- | ---------------------------- |
| `0x900C` (SendObjectInfo, vendor) | Announce object metadata     |
| `0x900D` (SendObject2, vendor)    | Stream the RAF bytes         |
| `0xF802` (object format)          | RAF object format identifier |
| Filename                          | `FUP_FILE.dat`               |

(See spec §6.4 for the full conversion flow.)

## Preset properties

(See filmkit `QUICK_REFERENCE.md` for `D18C..D1A5` mappings — full table
to be ported into this doc as the codec stabilizes.)

## Transport contract

(See spec §8 for the responsibility split between PtpTransport and FujiCameraSession.)
