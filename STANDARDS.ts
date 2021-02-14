import * as fs from 'fs'
import * as path from 'path'
import * as packageJson from './package.json'

describe('Distribution', () => {
  it('Name and description', () => {
    expect(packageJson).toHaveProperty('name')
    expect(packageJson).toHaveProperty('description')
  })

  it('Main entry point', () => {
    expect(fs.existsSync(packageJson.main)).toBe(true)
  })

  it('Type definitions', () => {
    expect(fs.existsSync(packageJson.types)).toBe(true)
  })
})

describe('Community', () => {
  it('README', () => {
    const filenames = ['README', 'README.md']
    expect(filenames.some(fs.existsSync)).toBe(true)
  })

  it('Code of conduct', () => {
    const filenames = ['CODE_OF_CONDUCT', 'CODE_OF_CONDUCT.md']
    expect(filenames.some(fs.existsSync)).toBe(true)
  })

  it('Contributing guidelines', () => {
    const filenames = ['CONTRIBUTING', 'CONTRIBUTING.md']
    const locations = ['.', '.github']

    expect(
      filenames.some((filename) => {
        return locations.some((location) => {
          return fs.existsSync(path.resolve(location, filename))
        })
      }),
    )
  })

  it('License', () => {
    expect(packageJson).toHaveProperty('license')

    const filenames = ['LICENSE', 'LICENSE.md']
    expect(filenames.some(fs.existsSync)).toBe(true)
  })
})
