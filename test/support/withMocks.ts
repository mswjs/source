import { RequestHandler } from 'msw'
import { setupServer } from 'msw/node'

export async function withMocks<R>(
  handlers: RequestHandler[],
  callback: () => Promise<R>,
): Promise<R> {
  const server = setupServer(...handlers)
  server.listen()

  try {
    const result = await callback()
    return result
  } finally {
    server.close()
  }
}
