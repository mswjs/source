<p align="center">
  <img src="source-logo.png" width="100" alt="Source Logo" />
</p>

<h1 align="center">Source</h1>

Generate [MSW](https://github.com/mswjs/msw) request handlers from OpenAPI documents, HAR archives, and other sources.

Here's an exampe of the [Node.js integration](https://mswjs.io/docs/integrations/node) of MSW using request handlers generated from a `github.com.har` file:

```js
import { setupServer } from 'msw/node'
import { fromTraffic } from '@mswjs/source'
import networkSnapshot from './github.com.har'

const handlers = fromTraffic(networkSnapshot)

const server = setupServer(...handlers)
server.listen()
```

## Getting started

### Install

```sh
npm install @mswjs/source
```

> This library requires you to install the `msw` package as a peer dependency.

## Source types

You can generate request handlers from multiple sources, including at the same time:

- [HTTP Archive (HAR file)](#http-archive)
- [OpenAPI (Swagger)](#openapi-swagger)

## HTTP archive

Use the `fromTraffic` function to generate request handlers from an [HTTP Archive (HAR)](<https://en.wikipedia.org/wiki/HAR_(file_format)>):

```js
import { fromTraffic } from '@mswjs/source'

// Import the HAR file or read it from the file system.
// HAR files are similar to JSON so they can be imported directly.
import networkSnapshot from './github.com.har'

export const handlers = fromTraffic(networkSnapshot)
```

### Exporting an HAR file

There are multiple ways to obtain an HAR file. The most common one is exporting the network snapshot directly from your browser.

Below, you can find detailed instructions on how to do that in modern browsers.

<details>
  <summary><strong>Google Chrome</strong></summary>
  <ol>
    <li>Navigate to the desired page;</li>
    <li>Open the Dev Tools (<kbd>⌘ + ⌥ + I</kbd> on MacOS; <kbd>Ctrl + Shift + I</kbd> on Windows/Linux);</li>
    <li>Click on the "<em>Network</em>" tab in the Dev Tools;</li>
    <li>Click the <kbd>⤓</kbd> (<em>Export HAR...</em>) icon;</li>
    <li>Choose where to save the HAR file.</li>
  </ol>
</details>

<details>
  <summary><strong>Firefox</strong></summary>
  <ol>
    <li>Navigate to the desired page;</li>
    <li>Open the Dev Tools (<kbd>⌘ + ⌥ + I</kbd> on MacOS; <kbd>Ctrl + Shift + I</kbd> on Windows/Linux);</li>
    <li>Click on the "<em>⇅ Network</em>" tab in the Dev Tools;</li>
    <li>Click on the <kbd>⚙</kbd> icon next to the throttling settings;</li>
    <li>Choose "<em>Save all as HAR</em>";</li>
    <li>Choose where to save the HAR file.</li>
  </ol>
</details>

<details>
  <summary><strong>Safari</strong></summary>
 <ol>
    <li>Navigate to the desired page;</li>
    <li>Open the Dev Tools (<kbd>⌘ + ⌥ + I</kbd>);</li>
    <li>Click on the "<em>⇅ Network</em>" tab in the Dev Tools;</li>
    <li>Click on the <kbd>Export</kbd> button;</li>
    <li>Choose where to save the HAR file.</li>
  </ol>
</details>

### Features

- [Response timing](#response-timing)
- [Response order sensitivity](#response-order-sensitivity)
- [Customizing generated handlers](#customizing-generated-handlers)

#### Response timing

Generated request handlers respect the response timing present in the HAR entries.

For example, take a look at this archive describing a request/response entry:

```json
{
  "log": {
    "entries": [
      {
        "request": {
          "method": "GET",
          "url": "https://example.com/resource"
        },
        "response": {
          "content": "hello world"
        },
        "time": 554
      }
    ]
  }
}
```

The generated request handler for `GET https://example.com/resource` will automatically have a _delayed_ response using the `log.entries[i].time` (ms) as the delay duration. Roughly, it translates to the following request handler:

```js
import { delay, HttpResponse } from 'msw'

rest.get('https://example.com/resource', async () => {
  // Delay the mocked response by the response time recorded in the archive.
  await delay(554)
  return new HttpResponse('hello world')
})
```

#### Response order sensitivity

If the same request has multiple responses in the archive, those responses will be used sequentially in the handlers.

> Note that this library does a straightforward request URL matching and disregards any other parameters (like request headers or body) when looking up the next chronological response to use.

Consider the following archive that has different responses for the same `GET https://example.com/user` request:

```json
{
  "log": {
    "entries": [
      {
        "request": {
          "method": "GET",
          "url": "https://example.com/user"
        },
        "response": {
          "content": {
            "text": "john"
          }
        }
      },
      {
        "request": {
          "method": "GET",
          "url": "https://example.com/user"
        },
        "response": {
          "status": 404,
          "content": {
            "text": "User Not Found"
          }
        }
      }
    ]
  }
}
```

When translated to request handlers, these are the mocked responses you get:

```js
// The first response was "john", so you receive it
// upon the first request.
fetch('https://example.com/user').then((res) => res.text())
// "john"

// The second response, however, was a 404 error.
fetch('https://example.com/user').then((res) => res.text())
// "User Not Found"
```

Note that any subsequent request to the same endpoint **will receive the _latest_ response** it has in the HAR. In the example above, any subsequent request will receive a mocked `404` response.

#### Customizing generated handlers

The `fromTraffic` function accepts an optional second argument, which is a function that maps each network entry in the archive. You can use this function to modify or skip certain entries when generating request handlers.

Here's an example of ignoring all requests to `https://api.github.com` in the HAR file:

```js
fromTraffic(har, (entry) => {
  if (entry.request.url.startsWith('https://api.github.com')) {
    return
  }

  return entry
})
```

> Return the `entry` object if you wish to generate a request handler for it, or return nothing if the current HAR entry must not have any associated handlers.

---

## OpenAPI (Swagger)

Use the `fromOpenApi` function to generate request handlers from an [OpenAPI specification](https://swagger.io/specification) document.

```js
import { fromOpenApi } from '@mswjs/source'

// Import your OpenAPI (Swagger) speficiation (JSON).
import specification from './v2.json'

const handlers = await fromOpenApi(specification)
```

OpenAPI support implies two major features: generating request handlers from the `paths`, and seeding the schema with random, fake data based on the schema types (`string`, `array`, `object`, etc.).

### Base path

This library respects the [base paths](https://swagger.io/docs/specification/api-host-and-base-path/) when generating request handlers URLs.

Take a look at the following OpenAPI 3.0 specification as an example:

```json
{
  "openapi": "3.0.0",
  "servers": [
    { "url": "https://api.github.com" },
    { "url": "https://api.github.com/v2" }
  ],
  "paths": {
    "/user": {
      "get": {
        /* Response specification */
      }
    }
  }
}
```

The following request handlers will be generated, respecting the `servers`:

```
- GET https://api.github.com/user
- GET https://api.github.com/v2/user
```

> Note that both request handlers will have the same resolver as defined per `paths['/user'].get`.

### Custom formats

In addition to the [standard formats](https://swagger.io/docs/specification/data-models/data-types/#format), this library supports the following custom `format` values:

#### string

- `uuid`
- `email`
- `password`
- `hostname`
- `ipv4`
- `ipv6`
- `hexcolor`
- `creditcard`
- `mac`

### Response body

A mocked response body is extracted from various places of your specification.

#### Explicit examples

Whenever a response, or its part, has a designated `"example"` property, that example is used as the mocked response value.

```json
{
  "/user": {
    "get": {
      "responses": {
        "200": {
          "example": {
            "id": "abc-123",
            "firstName": "John"
          }
        }
      }
    }
  }
}
```

```js
fetch('/user').then((res) => res.json())
// { "id": "abc-123", "firstName": "John" }
```

> Note that explicit `"example"` **always takes precedence**, being a more reliable source for the response structure.

#### JSON Schema

We support response structures written with JSON Schema. The schema types are used to generate respective random values.

> See the [JSON Schema tests](./test/oas) to learn more about random data generation.

### Conditional responses

A single request may have multiple responses specified in the documentation, separated by the response status code. You can control which mocked response a particular request receives by providing that response code as the `response` query parameter of the request URL.

For example, consider this OpenAPI document that specifies multiple responses for the same request:

```json
{
  "paths": {
    "/user": {
      "get": {
        "responses": {
          "200": {},
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "pattern": "^ER-[0-9]+$"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

If you wish to model a scenario when the server responds with the 500 response based on the specification above, include the `response=500` query parameter in your request URL:

```js
// This request receives the "500" response
// based on the specification above.
const res = await fetch('/user?response=500')
const json = await res.json()
// { "code": "ER-1443", "message": "Test message" }
```

### Content types

You can control what content types are returned from the mocked response via the `Accept` request header.

For example, if your resource defined both `application/json` and `application/xml` responses, here's how you'd ensure your client gets the XML response from the mock:

```js
fetch('/resource', {
  headers: {
    Accept: 'application/xml',
  },
})
```

> Wildcard values like `*/*` and `application/*` are also supported. When provided, the first response which mime type matches the header would be used as the mocked response.
