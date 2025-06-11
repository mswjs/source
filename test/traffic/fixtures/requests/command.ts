import { execSync } from 'node:child_process'

execSync(`tsx test/traffic/fixtures/requests/${process.argv[2]}`, {
  stdio: 'inherit',
})
