import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.get('/json', (req, res) => {
      res.json({
        id: 'abc-123',
        firstName: 'John',
      })
    })
  },
  (server) => [[server.http.makeUrl('/json')]],
)
