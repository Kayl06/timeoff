import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))

function liveSource(relativePath: string): string {
  const source = readFileSync(join(dir, relativePath), 'utf8')
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
}

describe('Leave Balance card empty and fetch-error states', () => {
  it('renders Empty state body inside a still-visible Card when there are no rows', () => {
    const card = liveSource('../components/dashboard/leave-balance-card.tsx')

    assert.match(card, /No leave balance information available/)
    assert.match(card, /if\s*\([^)]*(leaveBalance|cardBalances)[^)]*length\s*===\s*0/)
    assert.doesNotMatch(card, /remaining_days\s*===\s*0/)
    assert.match(card, /Leave Balance/)
  })

  it('toasts Failed to load leave balances when the leaveBalance query errors', () => {
    const hook = liveSource('../hooks/use-dashboard-data.ts')
    const start = hook.indexOf("queryKey: ['leaveBalance'")
    const end = hook.indexOf("queryKey: ['recentRequests'")
    assert.ok(start >= 0, 'leaveBalance query is present')
    assert.ok(end > start, 'recentRequests query follows leaveBalance')

    const leaveBalanceQuery = hook.slice(start, end)
    assert.match(
      leaveBalanceQuery,
      /toast\.error\(\s*['"]Failed to load leave balances['"]\s*\)/
    )
    assert.match(leaveBalanceQuery, /\/api\/leave-balances/)
  })

  it('fetches leave balances with session credentials include', () => {
    const hook = liveSource('../hooks/use-dashboard-data.ts')
    assert.match(hook, /fetch\(url,\s*\{\s*credentials:\s*['"]include['"]\s*\}\)/)
    assert.match(hook, /\/api\/leave-balances/)
  })
})

describe('Leave Balance card type order and extra types', () => {
  it('maps populated rows through balancesForLeaveCard, not the raw prop', () => {
    const card = liveSource('../components/dashboard/leave-balance-card.tsx')

    assert.match(card, /import \{ balancesForLeaveCard \} from '@\/lib\/leave-balance-display'/)
    assert.match(card, /balancesForLeaveCard\(leaveBalance/)
    assert.match(card, /cardBalances\.map\(/)
    assert.doesNotMatch(card, /leaveBalance\.map\(/)
  })

  it('shows empty copy when only extra types remain after filtering', () => {
    const card = liveSource('../components/dashboard/leave-balance-card.tsx')

    assert.match(card, /if\s*\(\s*cardBalances\.length\s*===\s*0\s*\)/)
  })

  it('does not iterate a maternity-capable extra type list for populated rows', () => {
    const card = liveSource('../components/dashboard/leave-balance-card.tsx')
    const mapIdx = card.indexOf('cardBalances.map')
    assert.ok(mapIdx >= 0, 'populated map uses cardBalances')
    const populated = card.slice(mapIdx)
    assert.doesNotMatch(populated, /\[.vacation., .sick., .personal., .maternity/)
  })
})
