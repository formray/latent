/** Little-endian binary pack/unpack helpers (mirrors Python struct.pack) */

// ==========================================================================
// PTP Dataset Reader — cursor-based parser for GetDeviceInfo, PropDesc, etc.
// ==========================================================================

export class PTPReader {
  private view: DataView
  private pos = 0

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  get remaining(): number { return this.view.byteLength - this.pos }

  u8(): number  { const v = this.view.getUint8(this.pos);          this.pos += 1; return v }
  u16(): number { const v = this.view.getUint16(this.pos, true);   this.pos += 2; return v }
  u32(): number { const v = this.view.getUint32(this.pos, true);   this.pos += 4; return v }
  i8(): number  { const v = this.view.getInt8(this.pos);           this.pos += 1; return v }
  i16(): number { const v = this.view.getInt16(this.pos, true);    this.pos += 2; return v }
  i32(): number { const v = this.view.getInt32(this.pos, true);    this.pos += 4; return v }

  /** PTP string: uint8 numChars (incl. null), then numChars × UCS-2LE */
  str(): string {
    const numChars = this.u8()
    if (numChars === 0) return ''
    let s = ''
    for (let i = 0; i < numChars; i++) {
      const ch = this.u16()
      if (ch !== 0) s += String.fromCharCode(ch)
    }
    return s
  }

  /** PTP uint16 array: uint32 count, then count × uint16 */
  u16array(): number[] {
    const count = this.u32()
    const arr: number[] = []
    for (let i = 0; i < count; i++) arr.push(this.u16())
    return arr
  }

  /** PTP uint32 array: uint32 count, then count × uint32 */
  u32array(): number[] {
    const count = this.u32()
    const arr: number[] = []
    for (let i = 0; i < count; i++) arr.push(this.u32())
    return arr
  }

  /** Read a value by PTP data type code */
  valueByType(dataType: number): number | string {
    switch (dataType) {
      case 0x0001: return this.i8()
      case 0x0002: return this.u8()
      case 0x0003: return this.i16()
      case 0x0004: return this.u16()
      case 0x0005: return this.i32()
      case 0x0006: return this.u32()
      case 0xFFFF: return this.str()
      default:     return this.u32() // best guess for unknown types
    }
  }

  /** Size in bytes for a PTP data type */
  static typeSize(dataType: number): number {
    switch (dataType) {
      case 0x0001: case 0x0002: return 1
      case 0x0003: case 0x0004: return 2
      case 0x0005: case 0x0006: return 4
      default: return 4
    }
  }
}

/** Parse a PTP string from raw bytes (uint8 length + UCS-2LE chars) */
export function parsePTPStringRaw(data: Uint8Array): string {
  if (data.length < 1) return ''
  const r = new PTPReader(data)
  return r.str()
}

// ==========================================================================
// Pack helpers
// ==========================================================================

export function packI16(value: number): Uint8Array {
  const buf = new ArrayBuffer(2)
  new DataView(buf).setInt16(0, value, true)
  return new Uint8Array(buf)
}

export function packU16(value: number): Uint8Array {
  const buf = new ArrayBuffer(2)
  new DataView(buf).setUint16(0, value, true)
  return new Uint8Array(buf)
}

export function packU32(value: number): Uint8Array {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setUint32(0, value, true)
  return new Uint8Array(buf)
}

export function packI32(value: number): Uint8Array {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setInt32(0, value, true)
  return new Uint8Array(buf)
}

export function unpackU16(data: DataView, offset: number): number {
  return data.getUint16(offset, true)
}

export function unpackU32(data: DataView, offset: number): number {
  return data.getUint32(offset, true)
}

export function concat(...buffers: (Uint8Array | ArrayBuffer)[]): Uint8Array<ArrayBuffer> {
  const arrays = buffers.map(b => b instanceof Uint8Array ? b : new Uint8Array(b))
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/** Pack a PTP string: length byte + UTF-16LE chars + null terminator */
export function packPTPString(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array([0])
  const parts: Uint8Array[] = []
  parts.push(new Uint8Array([str.length + 1])) // length including null
  for (const char of str) {
    parts.push(packU16(char.charCodeAt(0)))
  }
  parts.push(packU16(0)) // null terminator
  return concat(...parts)
}
