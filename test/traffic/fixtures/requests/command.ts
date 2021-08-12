import { execSync } from 'child_process'

execSync(`ts-node test/traffic/fixtures/requests/${process.argv[2]}`)
