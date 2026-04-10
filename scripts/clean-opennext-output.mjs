import { rm } from 'node:fs/promises'

const targets = [
  '.open-next/image-optimization-function',
  '.open-next/server-function',
  '.open-next',
]

for (const target of targets) {
  try {
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 150,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    console.warn(`Skipping cleanup for ${target}: ${details}`)
  }
}
