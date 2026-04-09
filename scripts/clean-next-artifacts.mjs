import { rm } from 'node:fs/promises'

const targets = ['.next/build', '.next/standalone']

for (const target of targets) {
  try {
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    console.warn(`Skipping cleanup for ${target}: ${details}`)
  }
}
