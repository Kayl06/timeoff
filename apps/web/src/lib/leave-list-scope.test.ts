import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { UserRole } from '@timeoff/types'
import {
  defaultLeaveListScope,
  resolveLeaveListScope,
} from './leave-list-scope.ts'

describe('defaultLeaveListScope', () => {
  it('returns all for admin and hr', () => {
    assert.equal(defaultLeaveListScope(UserRole.ADMIN), 'all')
    assert.equal(defaultLeaveListScope(UserRole.HR), 'all')
  })

  it('returns team for supervisor', () => {
    assert.equal(defaultLeaveListScope(UserRole.SUPERVISOR), 'team')
  })

  it('returns own for employee and unknown roles', () => {
    assert.equal(defaultLeaveListScope(UserRole.EMPLOYEE), 'own')
    assert.equal(defaultLeaveListScope('contractor'), 'own')
  })
})

describe('resolveLeaveListScope', () => {
  it('ignores employee requests for team or all', () => {
    assert.equal(resolveLeaveListScope(UserRole.EMPLOYEE, 'all'), 'own')
    assert.equal(resolveLeaveListScope(UserRole.EMPLOYEE, 'team'), 'own')
    assert.equal(resolveLeaveListScope(UserRole.EMPLOYEE, 'own'), 'own')
  })

  it('ignores supervisor requests for all but allows own and team', () => {
    assert.equal(resolveLeaveListScope(UserRole.SUPERVISOR, 'all'), 'team')
    assert.equal(resolveLeaveListScope(UserRole.SUPERVISOR, 'team'), 'team')
    assert.equal(resolveLeaveListScope(UserRole.SUPERVISOR, 'own'), 'own')
  })

  it('allows admin and hr to request own, team, or all', () => {
    assert.equal(resolveLeaveListScope(UserRole.ADMIN, 'own'), 'own')
    assert.equal(resolveLeaveListScope(UserRole.ADMIN, 'team'), 'team')
    assert.equal(resolveLeaveListScope(UserRole.HR, 'all'), 'all')
  })

  it('uses the role default when scope is missing or garbage', () => {
    assert.equal(resolveLeaveListScope(UserRole.EMPLOYEE, null), 'own')
    assert.equal(resolveLeaveListScope(UserRole.SUPERVISOR, 'ALL'), 'team')
    assert.equal(resolveLeaveListScope(UserRole.ADMIN, undefined), 'all')
  })
})
