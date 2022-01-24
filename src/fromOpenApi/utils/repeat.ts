import { datatype } from 'faker'

export function repeat(min: number, max: number, callback: () => void): void {
  const count = datatype.number({ min, max })
  for (let i = 0; i < count; i++) {
    callback()
  }
}
