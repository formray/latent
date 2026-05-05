# Investigate Fuji RAF preview ignoring Kelvin color temperature

Status: Open
Type: Bug / protocol investigation
Created: 2026-05-05

## Summary

Fuji camera-backed RAF preview currently appears to ignore Kelvin / Color
Temperature changes in the D185 raw-conversion profile, while WB Shift R/B is
applied correctly.

## Evidence

Tested with the RAF workspace diagnostic renders on an X-S20:

- `Full recipe 2500K` and `Full recipe 10000K` render visually identical.
- `Full recipe WB R+9 B-9` and `Full recipe WB R-9 B+9` render with strong,
  expected color shifts.
- The D185 profile payload is 625 bytes and the app patches:
  - WB mode index 12 = `0x8007`
  - WB color temp index 15 = requested Kelvin
  - WB shift indices 13/14 = requested R/B shifts

## Attempted Fix

Tried temporarily setting live camera props before RAF conversion:

- PTP `WhiteBalance` `0x5005 = 0x8007`
- Fuji `ColorTemperature` `0xD007 = <Kelvin>`

The camera rejected this path with PTP response `0x201c`
(`InvalidDevicePropValue`), so the attempt was rolled back and must not be
treated as a reliable fix.

## Current Product Behavior

- Keep Kelvin in recipes and camera preset/write flows.
- In RAF preview, warn that Fuji may keep the RAF file's original color
  temperature.
- Keep WB Shift R/B live in RAF preview because it is verified to work.
- Keep diagnostic variants for Kelvin extremes and WB Shift extremes.

## Follow-Up Needed

Capture or otherwise discover the protocol used by FUJIFILM X RAW STUDIO for
Kelvin during RAW conversion. X RAW Studio 1.28.0 on macOS Tahoe 26.4.1 did not
detect the camera even though macOS enumerated it as Fujifilm PTP
(`0x04CB:0x02F7`), so Wireshark capture was blocked for now.

## Acceptance Criteria

- A protocol-level fix makes `2500K` vs `10000K` visibly different in RAF
  preview without breaking WB Shift.
- If no fix is possible, the limitation is documented and Kelvin remains
  clearly marked as not preview-accurate in the RAF workspace.
- Tests cover any added property/opcode behavior and fallback handling.
