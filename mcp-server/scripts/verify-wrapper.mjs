import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const wrapperPath = join(process.cwd(), 'bin', 'pinksundew-mcp.js')
const wrapper = readFileSync(wrapperPath, 'utf-8')

if (!wrapper.includes('PINKSUNDEW_MCP_BINARY_PATH')) {
  throw new Error('Wrapper validation failed: expected binary path override env support.')
}

if (!wrapper.includes('spawn(binaryPath')) {
  throw new Error('Wrapper validation failed: expected native spawn flow.')
}

process.stderr.write('[verify-wrapper] launcher checks passed\n')
