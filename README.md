# mp3-duration-estimate

[![npm version](http://img.shields.io/npm/v/mp3-duration-estimate.svg?style=flat)](https://npmjs.org/package/mp3-duration-estimate "View this project on npm")

Estimate the duration of MP3 file with minimum read operations. Can be used to get the duration of remote MP3 file without the need for a full download.

## Installation

```
npm install mp3-duration-estimate
```

## Usage

```javascript
import createEstimator, { FetchDataReader } from 'mp3-duration-estimate'

// You can provide any Fetch API-compatible fetch function
import fetch from 'node-fetch'

const estimator = createEstimator(new FetchDataReader(fetch))

estimator('https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_5MG.mp3')
  .then(duration => console.log(duration))
  .catch(error => console.error(error))
```
Root export `createEstimator` takes a `DataReader` object as an argument. It is an abstract interface for reading parts of MP3 data. The object should have the following shape:

```typescript
export interface DataReader<ResourceLocationT> {
  getTotalLength(resource: ResourceLocationT): Promise<number | undefined>
  readBytesRange(resource: ResourceLocationT, from: number, to?: number): Promise<BytesRangeResponse>
}

export interface BytesRangeResponse {
  data: Uint8Array // Fetched inary data
  range?: {
    unit: string   // Should be 'bytes'
    start?: number // The start offset of the data in the MP3 files
    end?: number   // The end offset of the data in the MP3 files
    size?: number  // Total length of MP3 file
  }
}
```

Two implementations of Data Readers are provided by this package:
`FetchDataReader` - uses Fetch-compatible function to access the data over HTTP.
`AxiosDataReader` - uses axios library (should be installed separately) to access the data over HTTP.

## Using in Browsers

The library relies on content range requests. Using this library directly from browser web application is only possible if the server where MP3 file resides has allowed access by providing the valid CORS configuration with `Content-Range ` header allowed, which is not a CORS-safelisted header.
