import { getAcceptedContentTypes } from './open-api-utils.js'

function requestWithAccept(accept: string): Request {
  return new Request('https://github.com/mswjs/source', {
    headers: [['accept', accept]],
  })
}

it('handles a single content-type', () => {
  expect(getAcceptedContentTypes(requestWithAccept('text/html'))).toEqual([
    'text/html',
  ])
})

it('ignores optional whitespace', () => {
  expect(
    getAcceptedContentTypes(
      requestWithAccept('text/html, application/xhtml+xml, */*'),
    ),
  ).toEqual(['text/html', 'application/xhtml+xml', '*/*'])
})

it('removed empty content-types', () => {
  expect(
    getAcceptedContentTypes(requestWithAccept('text/html, , */*')),
  ).toEqual(['text/html', '*/*'])
})

describe.skip('handles complex Accept headers', () => {
  it('like weight reordering', () => {
    expect(
      getAcceptedContentTypes(
        requestWithAccept(
          'text/plain; q=0.5, text/html, text/x-dvi; q=0.8, text/x-c',
        ),
      ),
    ).toEqual(['text/html', 'text/x-c', 'text/x-dvi', 'text/plain'])
  })
  it('like specificity reordering', () => {
    expect(
      getAcceptedContentTypes(
        requestWithAccept('text/*, text/plain, text/plain;format=flowed, */*'),
      ),
    ).toEqual(['text/plain;format=flowed', 'text/plain', 'text/*', '*/*'])
  })
})
