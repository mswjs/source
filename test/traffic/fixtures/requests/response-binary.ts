import * as fs from 'fs'
import * as path from 'path'
import { createTrafficScenario } from '../../utils/createTrafficScenario'

createTrafficScenario(
  (app) => {
    app.get('/binary', (req, res) => {
      const imageBinary = fs.readFileSync(
        path.resolve(__dirname, '..', 'fixtures/image.jpg'),
      )

      res.writeHead(200, {
        'Content-Type': 'image/jpg',
        'Content-Length': imageBinary.length,
      })
      res.end(imageBinary)
    })
  },
  (server) => [[server.http.makeUrl('/binary')]],
)
