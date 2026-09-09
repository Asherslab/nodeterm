import { describe, it, expect } from 'vitest'
import { actionNeedsGuestFocus } from './browser-verb'

describe('actionNeedsGuestFocus', () => {
  it('is true for exactly the Input.* dispatching actions', () => {
    for (const k of ['click', 'type', 'press', 'scroll'] as const) {
      expect(actionNeedsGuestFocus(k)).toBe(true)
    }
  })

  it('is false for every action that dispatches no input', () => {
    // Touching the user's focus for a read, a navigation, a screenshot or a cookie read would be a
    // focus theft with nothing to show for it.
    for (const k of ['nav', 'read', 'wait', 'screenshot', 'cookies'] as const) {
      expect(actionNeedsGuestFocus(k)).toBe(false)
    }
  })
})
