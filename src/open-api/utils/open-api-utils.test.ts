import { getAcceptedContentTypes } from './open-api-utils.js'

it('returns a single content type as-is', () => {
  expect(
    getAcceptedContentTypes(new Headers([['accept', 'text/html']])),
  ).toEqual(['text/html'])
})

it('ignores whitespace separating multiple content types', () => {
  expect(
    getAcceptedContentTypes(
      new Headers([['accept', 'text/html, application/xhtml+xml, */*']]),
    ),
  ).toEqual(['text/html', 'application/xhtml+xml', '*/*'])
})

it('removes an empty content type', () => {
  expect(getAcceptedContentTypes(new Headers([['accept', ', ,']]))).toEqual([])

  expect(
    getAcceptedContentTypes(new Headers([['accept', 'text/html, , */*']])),
  ).toEqual(['text/html', '*/*'])
})

describe.skip('complex "accept" headers', () => {
  it('supports weight reordering', () => {
    expect(
      getAcceptedContentTypes(
        new Headers([
          [
            'accept',
            'text/plain; q=0.5, text/html, text/x-dvi; q=0.8, text/x-c',
          ],
        ]),
      ),
    ).toEqual(['text/html', 'text/x-c', 'text/x-dvi', 'text/plain'])
  })

  it('supports specificity reordering', () => {
    expect(
      getAcceptedContentTypes(
        new Headers([
          ['accept', 'text/*, text/plain, text/plain;format=flowed, */*'],
        ]),
      ),
    ).toEqual(['text/plain;format=flowed', 'text/plain', 'text/*', '*/*'])
  })
})
