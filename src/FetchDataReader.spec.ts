import test from 'ava'
import fetch from 'node-fetch'
import createEstimateMP3Duration from './createEstimateMP3Duration'
import FetchDataReader from './FetchDataReader'

test('fetch: fetch mp3 duration of the actual file on web', t => {
  const estimate = createEstimateMP3Duration(new FetchDataReader(fetch))

  return estimate(
    'https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_5MG.mp3'
  ).then(duration => {
    t.is(duration, 132)
  })
})
