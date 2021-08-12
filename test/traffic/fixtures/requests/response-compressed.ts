import * as compression from 'compression'
import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.use(compression({ threshold: 0 }))

    app.get('/json-compressed', (req, res) => {
      res.json({
        id: 'abc-123',
        firstName: 'John',
      })
    })
  },
  (server) => [[server.http.makeUrl('/json-compressed')]],
)
