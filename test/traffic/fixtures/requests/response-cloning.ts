import { createTrafficScenario } from '../../utils/create-traffic-scenario'

createTrafficScenario(
  (app) => {
    let isFirstRequest = true

    app.get('/resource', (req, res) => {
      if (isFirstRequest) {
        isFirstRequest = false
        return res.send('one')
      }

      res.send('two')
    })
  },
  (server) => [
    // Intentionally request two same endpoints.
    [server.http.url('/resource')],
    [server.http.url('/resource')],
  ],
)
