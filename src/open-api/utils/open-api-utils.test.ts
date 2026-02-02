import { getAcceptedContentTypes, getResponseStatus } from './open-api-utils.js'

describe(getAcceptedContentTypes, () => {
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
    expect(getAcceptedContentTypes(new Headers([['accept', ', ,']]))).toEqual(
      [],
    )

    expect(
      getAcceptedContentTypes(new Headers([['accept', 'text/html, , */*']])),
    ).toEqual(['text/html', '*/*'])
  })

  it.skip('supports weight reordering', () => {
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

  it.skip('supports specificity reordering', () => {
    expect(
      getAcceptedContentTypes(
        new Headers([
          ['accept', 'text/*, text/plain, text/plain;format=flowed, */*'],
        ]),
      ),
    ).toEqual(['text/plain;format=flowed', 'text/plain', 'text/*', '*/*'])
  })
})

describe(getResponseStatus, () => {
  it('returns 200 if 200 response is defined', () => {
    expect(getResponseStatus({ 200: { description: '' } })).toBe('200')
  })

  it('returns the first 2xx code if 200 response is not defined', () => {
    expect(
      getResponseStatus({
        201: { description: '' },
      }),
    ).toBe('201')

    expect(
      getResponseStatus({
        201: { description: '' },
        202: { description: '' },
      }),
    ).toBe('201')
  })

  it('returns undefined as the fallback', () => {
    expect(getResponseStatus({})).toBeUndefined()
  })
})
