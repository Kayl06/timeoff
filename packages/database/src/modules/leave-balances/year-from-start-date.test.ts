import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { yearFromStartDate } from './year-from-start-date.ts'

describe('yearFromStartDate', () => {
  it('returns the ISO prefix year for December 31', () => {
    assert.equal(yearFromStartDate('2025-12-31'), 2025)
  })

  it('throws Invalid start_date when the first four characters are not an integer', () => {
    assert.throws(() => yearFromStartDate('xxxx-12-31'), {
      name: 'Error',
      message: 'Invalid start_date',
    })
  })
})
