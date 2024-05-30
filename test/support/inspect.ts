import { RequestHandler, HttpHandler, GraphQLHandler } from 'msw'

export interface InspectedHandler<H extends RequestHandler = HttpHandler> {
  handler: SerializedHandler<H>
  response?: SerializedResponse
}

type SerializedHandler<H extends RequestHandler> = H extends HttpHandler
  ? {
      method: string
      path: string
    }
  : H extends GraphQLHandler
    ? {
        kind: string
        name: string
      }
    : never

export interface SerializedResponse {
  status: number
  statusText?: string
  headers: Array<[string, string]>
  body?: string
}

function isAbsoluteUrl(url: string) {
  return url.indexOf('://') > 0 || url.indexOf('//') === 0
}

async function inspectHandler<H extends RequestHandler>(
  handler: H,
): Promise<InspectedHandler<H>> {
  const requestId = Math.random().toString(16).slice(2)

  if (handler instanceof HttpHandler) {
    const pathOfHandler = handler.info.path as string

    const locationOrigin =
      typeof location !== 'undefined' ? location.origin : 'http://localhost'
    const fullQualifiedUrl = isAbsoluteUrl(pathOfHandler)
      ? pathOfHandler
      : `${locationOrigin}${pathOfHandler}`

    const result = await handler.run({
      request: new Request(fullQualifiedUrl, {
        method: handler.info.method.toString(),
      }),
      requestId,
    })

    return {
      handler: {
        method: handler.info.method.toString().toUpperCase(),
        path: fullQualifiedUrl,
      },
      response: await serializeResponse(result?.response),
    }
  }

  if (handler instanceof GraphQLHandler) {
    const result = await handler.run({
      request: new Request('', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
      requestId,
    })

    return {
      handler: {
        kind: handler.info.operationType,
        name: handler.info.operationName,
      },
      response: await serializeResponse(result?.response),
    }
  }

  throw new Error(
    `Failed to inspect handler "${handler.info.header}": unknown handler type`,
  )
}

export async function inspectHandlers(handlers: Array<RequestHandler>) {
  return await Promise.all(handlers.map(inspectHandler))
}

async function serializeResponse(
  response?: Response,
): Promise<SerializedResponse | undefined> {
  if (!response) {
    return
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers),
    body: await response.text(),
  }
}
