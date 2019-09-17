import { BytesRangeResponse, DataReader } from './createEstimateMP3Duration'

type Fetch = typeof fetch

export default class FetchDataReader implements DataReader<string> {
  private theFetch?: Fetch
  private contentRangeHeaderRegex = /([^\s]+)\s((([\d]+)-([\d]+))|\*)\/([\d]+|\*)/

  constructor (theFetch: Fetch) {
    this.theFetch = theFetch
    if (!this.theFetch) {
      throw new Error('Fetch API is not accessible')
    }
  }

  async getTotalLength (resource: string): Promise<number|undefined> {
    const response = await this.theFetch(resource, {
      method: 'HEAD',
      mode: 'no-cors'
    })
    
    const contentLength = response.headers.get('content-length')
    if (contentLength !== null) {
      const totalContentSize = parseInt(contentLength, 10)
      if (isNaN(totalContentSize)) {
        return undefined
      }
      return totalContentSize
    }

    return undefined
  }

  async readBytesRange (resource: string, from: number, to?: number): Promise<BytesRangeResponse> {
    const response = await this.theFetch(resource, {
      headers: {
        Range: `bytes=${from}-${to ? to : ''}`
      },
      mode: 'no-cors'
    })

    const arrayBuffer = await response.arrayBuffer()

    const rangeString = response.headers.get('content-range')
    let range: BytesRangeResponse['range']

    if (rangeString) {
      const result = this.contentRangeHeaderRegex.exec(rangeString)
      if (result) {
        const start = parseInt(result[4], 10)
        const end = parseInt(result[5], 10)
        const size = parseInt(result[6], 10)

        range = {
          unit: result[1],
          start: !isNaN(start) ? start : undefined,
          end: !isNaN(end) ? end : undefined,
          size: !isNaN(size) ? size : undefined
        }
      }
    }

    return {
      data: new Uint8Array(arrayBuffer),
      range
    }
  }
}
