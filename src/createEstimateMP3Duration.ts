interface ID3V2Header {
  size: number
  headerSize: number
}

interface MP3FrameHeader {
  bitrate: number
  samplingRate: number
  stereo: boolean
  mpegVersionBits: number
  layerBits: number
  bitrateBits: number
  samplingRateBits: number
  channelModeBits: number
}

const bitrates = [
  [
    // MPEG 2.5
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // LayerReserved
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // Layer3
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // Layer2
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256] // Layer1
  ],
  [
    // Reserved
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // LayerReserved
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Layer3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Layer2
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // Layer1
  ],
  [
    // MPEG 2
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // LayerReserved
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // Layer3
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // Layer2
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256] // Layer1
  ],
  [
    // MPEG 1
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // LayerReserved
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // Layer3
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], // Layer2
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448] // Layer1
  ]
]

const samplingRates = [
  // MPEG 2.5
  [11025, 12000, 8000, 0],
  // Reserved
  [0, 0, 0, 0],
  // MPEG 2
  [22050, 24000, 16000, 0],
  // MPEG 1
  [44100, 48000, 32000, 0]
]

export interface BytesRangeResponse {
  data: Uint8Array
  range?: {
    unit: string
    start?: number
    end?: number
    size?: number
  }
}

export interface DataReader<ResourceLocationT> {
  getTotalLength(resource: ResourceLocationT): Promise<number | undefined>
  readBytesRange(
    resource: ResourceLocationT,
    from: number,
    to?: number
  ): Promise<BytesRangeResponse>
}

function createEstimateMP3Duration<ResourceLocationT = string>(
  reader: DataReader<ResourceLocationT>
) {
  function readSynchsafeInteger(buffer: Uint8Array, size: number, offset: number = 0): number {
    const mask = 0x7f
    let out = 0

    for (let i = 0; i < size; ++i) {
      out = (out << 7) | (buffer[i + offset] & mask)
    }

    return out
  }

  async function readID3V2Header(
    resource: ResourceLocationT
  ): Promise<{ header?: ID3V2Header; data: Uint8Array; totalContentSize?: number }> {
    const res = await reader.readBytesRange(resource, 0, 9)
    const { data } = res

    if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      // It looks like ID3v2Tag indeed
      return {
        header: {
          headerSize: 10,
          size: readSynchsafeInteger(data, 4, 6)
        },
        data,
        totalContentSize: res.range ? res.range.size : undefined
      }
    } else {
      return {
        totalContentSize: res.range ? res.range.size : undefined,
        data
      }
    }
  }

  function parseMP3FrameHeader(header: Uint8Array, offset: number): MP3FrameHeader {
    const firstUI16BE = header[1] | (header[0] << 8)
    const syncWord = firstUI16BE & 0xffe0
    if (syncWord !== 0xffe0) {
      throw new Error(`Malformed MP3 file - frame not found at ${offset}`)
    }

    const mpegVersionBits = (firstUI16BE >> 3) & 0x3
    const layerBits = (firstUI16BE >> 1) & 0x3
    const bitrateBits = (header[2] & 0xf0) >> 4
    const samplingRateBits = (header[2] & 0x0f) >> 4
    const channelModeBits = header[3] >> 6

    return {
      bitrate: bitrates[mpegVersionBits][layerBits][bitrateBits],
      stereo: channelModeBits !== 3,
      samplingRate: samplingRates[mpegVersionBits][samplingRateBits],
      bitrateBits,
      layerBits,
      mpegVersionBits,
      samplingRateBits,
      channelModeBits
    }
  }

  return async function estimateMP3Duration(
    resource: ResourceLocationT
  ): Promise<number | undefined> {
    let { header, data, totalContentSize } = await readID3V2Header(resource)
    if (totalContentSize === undefined) {
      totalContentSize = await reader.getTotalLength(resource)
    }

    if (totalContentSize === undefined) {
      // If we were unable to determine the total size of the file,
      // there is no way we could estimate MP3 duration
      return totalContentSize
    }

    // The total size of audio frames
    // NOTE: we are ignoring ID3V1 section size
    // (it is exactly 128 bytes and it MAY be located at the end of the file)
    const firstFrameOffset = header ? header.size + header.headerSize : 0
    const totalAudioDataSize = totalContentSize - firstFrameOffset

    let mp3FrameHeader: MP3FrameHeader
    if (firstFrameOffset === 0) {
      mp3FrameHeader = parseMP3FrameHeader(data, 0)
    } else {
      const res = await reader.readBytesRange(resource, firstFrameOffset, firstFrameOffset + 3)
      mp3FrameHeader = parseMP3FrameHeader(res.data, firstFrameOffset)
    }

    return Math.floor(
      (totalAudioDataSize / ((mp3FrameHeader.bitrate / 8) * 1000)) * (mp3FrameHeader.stereo ? 1 : 2)
    )
  }
}

export default createEstimateMP3Duration
