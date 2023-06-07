import { describe, it, expect } from 'vitest'
import { joinPaths } from '../../../src/fromOpenApi/utils/url'

describe(joinPaths, () => {
  it('replaces multiple slashes in a given relative url', () => {
    expect(joinPaths('/path', '/base')).toEqual('/base/path')
    expect(joinPaths('//path', '//base/')).toEqual('/base/path')
  })

  it('prepends leading slashes where necessary', () => {
    expect(joinPaths('path', 'base')).toEqual('/base/path')
  })
})
