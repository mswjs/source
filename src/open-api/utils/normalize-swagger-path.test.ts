import { normalizeSwaggerPath } from './normalize-swagger-path.js'

it('replaces swagger path parameters with colons', () => {
  expect(normalizeSwaggerPath('/user/{userId}')).toEqual('/user/:userId')
  expect(
    normalizeSwaggerPath('https://{subdomain}.example.com/{resource}/recent'),
  ).toEqual('https://:subdomain.example.com/:resource/recent')
})

it('returns otherwise normal URL as-is', () => {
  expect(normalizeSwaggerPath('/user/abc-123')).toEqual('/user/abc-123')
  expect(
    normalizeSwaggerPath('https://finance.example.com/reports/recent'),
  ).toEqual('https://finance.example.com/reports/recent')
})
