import * as path from 'path'
import { chromium } from 'playwright'

export type TrafficDefinition = [RequestInfo, RequestInit?][]

const HTML_PAGE_PATH = path.resolve(__dirname, 'page.html')

export async function generateHttpArchive(
  traffic: TrafficDefinition,
): Promise<void> {
  console.log('loading browser with traffic', traffic)

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  })
  process.on('exit', async () => {
    await browser.close()
  })

  const context = await browser.newContext()

  const page = await context.newPage()
  await page.goto(`file://${HTML_PAGE_PATH}`)

  // Add a debugging timeout so that the requests
  // can be inspected in the opened devtools.
  await page.waitForTimeout(750)

  await page.evaluate((requests: TrafficDefinition) => {
    return Promise.all(
      requests.map(([init, info]) => {
        return fetch(init, info)
          .then((response) => {
            // Read the response body so that "playwright-har" reacts to that
            // and saves the read textual body in the HAR file.
            return response.text()
          })
          .catch((error) => {
            console.error('FETCH FAILED!', init, info, error)
          })
      }),
    )
  }, traffic)
}
