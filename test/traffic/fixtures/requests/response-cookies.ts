import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.get('/cookies', (req, res) => {
      res.cookie('secret-token', 'abc-123').send('yummy')
    })
  },
  (server) => [[server.http.makeUrl('/cookies')]],
)
