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
