#!/usr/bin/env node

import { chmodSync, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { rename, stat } from 'node:fs/promises'
import { homedir, platform, arch, tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { request as httpsRequest } from 'node:https'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const BINARY_ENV_PATH = 'PINKSUNDEW_MCP_BINARY_PATH'
const RELEASE_BASE_URL_ENV = 'PINKSUNDEW_MCP_RELEASE_BASE_URL'

function platformTarget() {
  const key = `${platform()}-${arch()}`

  const map = {
    'darwin-arm64': { target: 'aarch64-apple-darwin', ext: '' },
    'darwin-x64': { target: 'x86_64-apple-darwin', ext: '' },
    'linux-x64': { target: 'x86_64-unknown-linux-gnu', ext: '' },
    'linux-arm64': { target: 'aarch64-unknown-linux-gnu', ext: '' },
    'win32-x64': { target: 'x86_64-pc-windows-msvc', ext: '.exe' },
  }

  return map[key] ?? null
}

function cacheRoot() {
  return join(homedir(), '.cache', 'pinksundew-mcp', pkg.version)
}

function resolvedBaseUrl() {
  const override = process.env[RELEASE_BASE_URL_ENV]
  if (override && override.trim()) {
    return override.trim().replace(/\/+$/, '')
  }

  return `https://github.com/qadolphe/AgentPlanner/releases/download/mcp-v${pkg.version}`
}

async function download(url, outputPath) {
  await new Promise((resolve, reject) => {
    const request = httpsRequest(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume()
        download(response.headers.location, outputPath).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        const status = response.statusCode ?? 0
        response.resume()
        reject(new Error(`Download failed with HTTP ${status} for ${url}`))
        return
      }

      const out = createWriteStream(outputPath)
      pipeline(response, out).then(resolve).catch(reject)
    })

    request.on('error', reject)
    request.end()
  })
}

async function ensureBinary() {
  const overridePath = process.env[BINARY_ENV_PATH]
  if (overridePath && overridePath.trim()) {
    return overridePath.trim()
  }

  const target = platformTarget()
  if (!target) {
    throw new Error(
      `Unsupported platform/architecture: ${platform()}-${arch()}. ` +
        'Use PINKSUNDEW_MCP_BINARY_PATH to provide a custom binary.'
    )
  }

  const binName = `pinksundew-mcp-${target.target}${target.ext}`
  const root = cacheRoot()
  const finalPath = join(root, binName)

  if (existsSync(finalPath)) {
    return finalPath
  }

  mkdirSync(root, { recursive: true })

  const tmpPath = join(tmpdir(), `${basename(binName)}.${randomUUID()}.tmp`)
  const url = `${resolvedBaseUrl()}/${binName}`
  process.stderr.write(`[pinksundew-mcp] Downloading ${url}\n`)
  await download(url, tmpPath)
  await rename(tmpPath, finalPath)

  if (target.ext !== '.exe') {
    chmodSync(finalPath, 0o755)
  }

  const fileStat = await stat(finalPath)
  if (!fileStat.isFile()) {
    throw new Error(`Downloaded path is not a file: ${finalPath}`)
  }

  return finalPath
}

async function main() {
  let binaryPath

  try {
    binaryPath = await ensureBinary()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[pinksundew-mcp] Failed to resolve native binary: ${message}\n`)
    process.stderr.write(
      '[pinksundew-mcp] Set PINKSUNDEW_MCP_BINARY_PATH to an installed binary path, or install native release assets.\n'
    )
    process.exit(1)
  }

  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  })

  child.on('error', (error) => {
    process.stderr.write(`[pinksundew-mcp] Failed to launch ${binaryPath}: ${error.message}\n`)
    process.exit(1)
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.stderr.write(`[pinksundew-mcp] Native process exited via signal ${signal}\n`)
      process.exit(1)
    }

    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[pinksundew-mcp] Unexpected launcher error: ${message}\n`)
  process.exit(1)
})
