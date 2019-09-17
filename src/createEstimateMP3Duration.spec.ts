import test from 'ava'
import createEstimateMP3Duration, {
  DataReader,
  BytesRangeResponse
} from './createEstimateMP3Duration'

class MockDataReader implements DataReader<string> {
  async getTotalLength(resource: string): Promise<number | undefined> {
    if (resource === 'id3v2_no_content_size') {
      return 2749971
    }

    throw new Error(`Not found: ${resource}`)
  }

  async readBytesRange(resource: string, from: number, to?: number): Promise<BytesRangeResponse> {
    if (resource === 'id3v2' || resource === 'id3v2_no_content_size') {
      if (from === 0 && to === 9) {
        return {
          data: new Uint8Array([0x49, 0x44, 0x33, 0x02, 0x00, 0x00, 0x00, 0x01, 0x76, 0x77]),
          range: {
            start: 0,
            end: 10,
            unit: 'bytes',
            size: resource === 'id3v2_no_content_size' ? undefined : 2749971
          }
        }
      } else if (from === 31617 && to === 31620) {
        return {
          data: new Uint8Array([0xff, 0xfb, 0x80, 0x64]),
          range: {
            start: from,
            end: to,
            unit: 'bytes',
            size: resource === 'id3v2_no_content_size' ? undefined : 2749971
          }
        }
      } else {
        throw new Error(`Unexpected range ${from}-${to} for ${resource}`)
      }
    } else if (resource === 'no_id3v2_mono') {
      if (from === 0 && (to === 9 || to === 3)) {
        return {
          data: new Uint8Array([0xff, 0xf3, 0x70, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
          range: {
            start: 0,
            end: 10,
            unit: 'bytes',
            size: 48456
          }
        }
      } else {
        throw new Error(`Unexpected range ${from}-${to} for ${resource}`)
      }
    }

    throw new Error(`Not found: ${resource}`)
  }
}

const estimate = createEstimateMP3Duration(new MockDataReader())

test('valid duration for a file with a big id3v2 tag', t => {
  return estimate('id3v2').then(duration => {
    t.is(duration, 194)
  })
})

test('valid duration for a plain file with id3v2 tag, but with regular request not returning the data length', t => {
  return estimate('id3v2_no_content_size').then(duration => {
    t.is(duration, 194)
  })
})

test('valid duration for a plain file without id3v2 tag', t => {
  return estimate('no_id3v2_mono').then(duration => {
    t.is(duration, 13)
  })
})
