import { execSync } from 'node:child_process'

execSync(`ts-node test/traffic/fixtures/requests/${process.argv[2]}`, {
  stdio: 'inherit',
})
