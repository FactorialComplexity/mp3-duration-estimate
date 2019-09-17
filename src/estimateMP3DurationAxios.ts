import axios, { AxiosInstance } from 'axios'

import createEstimateMP3Duration, { DataReader, BytesRangeResponse } from './createEstimateMP3Duration'

export class AxiosDataReader implements DataReader<string> {
  private contentRangeHeaderRegex = /([^\s]+)\s((([\d]+)-([\d]+))|\*)\/([\d]+|\*)/
  private axios: AxiosInstance

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance || axios
  }

  async getTotalLength(resource: string): Promise<number|undefined> {
    const res = await this.axios.head(resource)
    if (res.headers['Content-Length']) {
      let totalContentSize = parseInt(res.headers['Content-Length'], 10)
      if (isNaN(totalContentSize)) {
        totalContentSize = undefined
      }
      return totalContentSize
    }
    return undefined
  }
  
  async readBytesRange(resource: string, from: number, to?: number): Promise<BytesRangeResponse> {
    const res = await this.axios.get(resource, {
      responseType: 'arraybuffer',
      headers: {
        Range: `bytes=${from}-${to ? to : ''}`
      }
    })

    if (Buffer.isBuffer(res.data)) {
      const rangeString = res.headers['content-range'] as string
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
        data: res.data,
        range
      }
    } else {
      throw new Error('Failed to fetch data for mp3 track')
    }
  }
}

export default createEstimateMP3Duration(new AxiosDataReader())
