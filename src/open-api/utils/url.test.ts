import { isAbsoluteUrl, joinPaths } from './url.js'

describe(isAbsoluteUrl, () => {
  it('returns true given an absolute url', () => {
    expect(isAbsoluteUrl('http://example.com')).toBe(true)
    expect(isAbsoluteUrl('https://example.com')).toBe(true)
    expect(isAbsoluteUrl('ftp://example.com')).toBe(true)
    expect(isAbsoluteUrl('file://example.com')).toBe(true)
  })

  it('returns false given a relative url', () => {
    expect(isAbsoluteUrl('/path')).toBe(false)
    expect(isAbsoluteUrl('path')).toBe(false)
    expect(isAbsoluteUrl('path/')).toBe(false)
    expect(isAbsoluteUrl('path?query=1')).toBe(false)
    expect(isAbsoluteUrl('path#hash')).toBe(false)
  })
})

describe(joinPaths, () => {
  it('replaces multiple slashes in a given relative url', () => {
    expect(joinPaths('/path', '/base')).toEqual('/base/path')
    expect(joinPaths('//path', '//base/')).toEqual('/base/path')
  })

  it('prepends leading slashes where necessary', () => {
    expect(joinPaths('path', 'base')).toEqual('/base/path')
  })
})
