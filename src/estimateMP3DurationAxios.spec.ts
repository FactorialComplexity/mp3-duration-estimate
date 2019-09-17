import test from 'ava'
import estimateMP3DurationAxios from './estimateMP3DurationAxios'

test('axios: fetch mp3 duration of the actual file on web', t => {
  return estimateMP3DurationAxios('https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_5MG.mp3')
    .then(duration => {
      t.is(duration, 132)
    })
})
