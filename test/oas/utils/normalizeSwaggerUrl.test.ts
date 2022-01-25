import { normalizeSwaggerUrl } from '../../../src/fromOpenApi/utils/normalizeSwaggerUrl'

it('replaces swagger path parameters with colons', () => {
  expect(normalizeSwaggerUrl('/user/{userId}')).toEqual('/user/:userId')
  expect(
    normalizeSwaggerUrl('https://{subdomain}.example.com/{resource}/recent'),
  ).toEqual('https://:subdomain.example.com/:resource/recent')
})

it('returns otherwise normal URL as-is', () => {
  expect(normalizeSwaggerUrl('/user/abc-123')).toEqual('/user/abc-123')
  expect(
    normalizeSwaggerUrl('https://finance.example.com/reports/recent'),
  ).toEqual('https://finance.example.com/reports/recent')
})
