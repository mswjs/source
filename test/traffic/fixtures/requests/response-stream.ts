import { createTrafficScenario } from '../../utils/createTrafficScenario'

function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

createTrafficScenario(
  (app) => {
    app.get('/stream', (req, res) => {
      const str = 'this is a chunked response'
      const chunks = str.match(/.{1,3}/g) || []

      res.set({
        'Content-Type': 'plain/text',
        'Content-Length': str.length,
      })

      for (const chunk of chunks) {
        res.write(chunk)
        sleep(250)
      }

      res.end()
    })
  },
  (server) => [[server.http.url('/stream')]],
)
