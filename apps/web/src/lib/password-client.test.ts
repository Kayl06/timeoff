import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PASSWORD_REQUIREMENTS } from './validation.ts'
import {
  firstPasswordError,
  mergeSignupFieldErrors,
  passwordMeetsApiRules,
  passwordRequirementItems,
} from './password-client.ts'

describe('passwordMeetsApiRules', () => {
  it('rejects a password shorter than minLength even with composition', () => {
    assert.equal(passwordMeetsApiRules('short8!!'), false)
  })

  it('rejects 12 lowercase letters with no upper, number, or special', () => {
    assert.equal(passwordMeetsApiRules('abcdefghijkl'), false)
  })

  it('accepts a 12-character password that meets composition rules', () => {
    assert.equal(passwordMeetsApiRules('Abcdefghij1!'), true)
  })
})

describe('firstPasswordError', () => {
  it('returns Password is required for empty input', () => {
    assert.equal(firstPasswordError(''), 'Password is required')
  })

  it('returns the minLength schema message for short8!!', () => {
    assert.equal(
      firstPasswordError('short8!!'),
      `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`
    )
  })

  it('returns the uppercase schema message when length is met but composition fails', () => {
    assert.equal(
      firstPasswordError('abcdefghijkl'),
      'Password must contain at least one uppercase letter'
    )
  })
})

describe('passwordRequirementItems', () => {
  it('uses PASSWORD_REQUIREMENTS.minLength in the length label and met flag', () => {
    const items = passwordRequirementItems('short8!!')
    assert.equal(items.length, 5)
    assert.equal(
      items[0].label,
      `At least ${PASSWORD_REQUIREMENTS.minLength} characters`
    )
    assert.equal(items[0].met, false)
    assert.equal('short8!!'.length >= PASSWORD_REQUIREMENTS.minLength, false)
  })

  it('marks length met when password.length >= PASSWORD_REQUIREMENTS.minLength', () => {
    const items = passwordRequirementItems('abcdefghijkl')
    assert.equal(items[0].met, true)
    assert.equal('abcdefghijkl'.length >= PASSWORD_REQUIREMENTS.minLength, true)
  })
})

describe('mergeSignupFieldErrors', () => {
  it('copies details.password onto the returned map', () => {
    const message = 'Password must be at least 12 characters'
    assert.deepEqual(mergeSignupFieldErrors({ password: message }), {
      password: message,
    })
  })

  it('returns an empty object when details is undefined', () => {
    assert.deepEqual(mergeSignupFieldErrors(undefined), {})
  })
})
