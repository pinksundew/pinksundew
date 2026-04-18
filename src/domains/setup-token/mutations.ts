import { createHash, randomBytes } from 'crypto'

export function generateSetupToken() {
  return `pst_${randomBytes(24).toString('hex')}`
}

export function hashSetupToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getSetupTokenExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString()
}
