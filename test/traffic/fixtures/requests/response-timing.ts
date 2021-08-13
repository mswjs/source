import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.get('/timing/instant', (req, res) => {
      res.send('hello world')
    })
    app.get('/timing/delayed', (req, res) => {
      setTimeout(() => {
        res.send('delayed body')
      }, 500)
    })
  },
  (server) => [
    [server.http.makeUrl('/timing/instant')],
    [server.http.makeUrl('/timing/delayed')],
  ],
)
