/**
 * PTP Container — the fundamental unit of PTP/USB communication.
 *
 * Every PTP message (command, data, response) is wrapped in a container with
 * a 12-byte header. This mirrors the PTPContainer class in rawji's fuji_usb.py.
 */

import { packU16, packU32, unpackU16, unpackU32, concat } from '../util/binary.ts'
import { ContainerType } from './constants.ts'

export interface PTPContainerData {
  type: number
  code: number
  transactionId: number
  params: number[]
  data: Uint8Array<ArrayBuffer>
}

const HEADER_SIZE = 12

/**
 * Pack a PTP container into bytes for USB transmission.
 *
 * Layout:
 *   [0-3]  uint32 LE: total length
 *   [4-5]  uint16 LE: container type
 *   [6-7]  uint16 LE: operation/response code
 *   [8-11] uint32 LE: transaction ID
 *   [12+]  up to 5 params (uint32 each) OR raw data payload
 */
export function packContainer(c: PTPContainerData): Uint8Array {
  const paramBytes = c.params.slice(0, 5).map(p => packU32(p))
  const paramsTotal = paramBytes.reduce((s, b) => s + b.length, 0)
  const totalLength = HEADER_SIZE + paramsTotal + c.data.length

  return concat(
    packU32(totalLength),
    packU16(c.type),
    packU16(c.code),
    packU32(c.transactionId),
    ...paramBytes,
    c.data,
  )
}

/**
 * Unpack a PTP container from USB response bytes.
 *
 * DATA containers: everything after header is payload (no params).
 * RESPONSE containers: up to 5 uint32 params after header (no payload).
 */
export function unpackContainer(raw: Uint8Array): PTPContainerData {
  if (raw.length < HEADER_SIZE) {
    throw new Error(`Container too short: ${raw.length} bytes`)
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const _length = unpackU32(view, 0)
  const type = unpackU16(view, 4)
  const code = unpackU16(view, 6)
  const transactionId = unpackU32(view, 8)

  const rest = raw.slice(HEADER_SIZE)
  const params: number[] = []
  let data = new Uint8Array(0)

  if (type === ContainerType.Data) {
    // DATA: everything after header is payload
    data = rest
  } else if (type === ContainerType.Response) {
    // RESPONSE: parse up to 5 uint32 params
    const restView = new DataView(rest.buffer, rest.byteOffset, rest.byteLength)
    let offset = 0
    while (offset + 4 <= rest.length && params.length < 5) {
      params.push(unpackU32(restView, offset))
      offset += 4
    }
  }

  return { type, code, transactionId, params, data }
}

/** Get the total length field from a raw container's first 4 bytes */
export function containerLength(raw: Uint8Array): number {
  if (raw.length < 4) return 0
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  return unpackU32(view, 0)
}
