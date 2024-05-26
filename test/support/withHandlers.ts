import { RequestHandler } from 'msw'
import { setupServer } from 'msw/node'

/**
 * Creates an MSW `server` instance, populates it
 * with the given `handlers`, runs the `callback`,
 * and cleans up afterward.
 *
 * @deprecated Remove this once all tests are migrated
 * NOT to use this. Use `inspectHandlers` instead.
 */
export async function withHandlers<R>(
  handlers: Array<RequestHandler>,
  callback: () => Promise<R>,
): Promise<R> {
  const server = setupServer(...handlers)

  server.listen({
    onUnhandledRequest: 'error',
  })

  try {
    const result = await callback()
    return result
  } finally {
    server.close()
  }
}
