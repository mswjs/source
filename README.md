# `@mswjs/source`

## Install

```sh
$ npm install @mswjs/source -D
# or
$ yarn add @mswjs/source -D
```

## Sources

### Browser traffic (HAR)

```js
import { fromTraffic } from '@mswjs/source'
import traffic from './github.com.har'

export const handlers = fromTraffic(traffic)
```

### Test runtime

```js
// jest.setup.js
import { setupServer } from 'msw/node'
import { fromRuntime } from '@mswjs/source'

const server = setupServer()

beforeAll(() => {
  server.listen()
  fromRuntime(server)
})
```

### OpenAPI (Swagger)

- Explain what spec properties are used as mocked responses.

```js
import { fromOpenApi } from '@mswjs/source'
import apiDocument from 'api.spec.json'

const apiDocument = fs.readFileSync('spec.json')
export const handlers = fromOpenApi(apiDocument)
```
