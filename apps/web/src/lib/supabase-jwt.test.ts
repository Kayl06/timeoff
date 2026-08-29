import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { decodeJwt } from 'jose'
import { mintTenantAccessToken } from './supabase-jwt.ts'

const jwtSecret = 'test-supabase-jwt-secret-not-for-production'
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const companyId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

describe('mintTenantAccessToken', () => {
  it('returns a JWT string with three segments', async () => {
    const token = await mintTenantAccessToken({ userId, companyId, jwtSecret })
    assert.equal(typeof token, 'string')
    assert.equal(token.split('.').length, 3)
  })

  it('payload has role authenticated, sub equal to userId, and company_id equal to companyId', async () => {
    const token = await mintTenantAccessToken({ userId, companyId, jwtSecret })
    const payload = decodeJwt(token)
    assert.equal(payload.role, 'authenticated')
    assert.equal(payload.sub, userId)
    assert.equal(payload.company_id, companyId)
  })
})

describe('jose pin', () => {
  it('apps/web dependencies.jose is the exact string 4.15.9', async () => {
    const pkgPath = new URL('../../package.json', import.meta.url)
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as {
      dependencies?: { jose?: string }
    }
    assert.equal(pkg.dependencies?.jose, '4.15.9')
  })
})
