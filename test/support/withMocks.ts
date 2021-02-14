import { RequestHandler } from 'msw'
import { setupServer } from 'msw/node'

export async function withMocks(
  handlers: RequestHandler[],
  callback: () => Promise<any>,
) {
  const server = setupServer(...handlers)
  server.listen()

  try {
    const result = await callback()
    return result
  } finally {
    server.close()
  }
}
