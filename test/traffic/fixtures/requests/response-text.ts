import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.get('/text', (req, res) => {
      res.send('hello world')
    })
  },
  (server) => [[server.http.url('/text')]],
)
