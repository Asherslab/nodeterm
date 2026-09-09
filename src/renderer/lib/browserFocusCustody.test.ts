import { describe, it, expect, vi } from 'vitest'
import { createFocusCustody, isRecordableFocus, shouldRestoreFocus } from './browserFocusCustody'

const el = (connected = true) => ({ focus: vi.fn(), isConnected: connected })

describe('browser focus custody', () => {
  it('never records an element inside a browser surface', () => {
    expect(isRecordableFocus(el(), true)).toBe(false)
    expect(isRecordableFocus(el(), false)).toBe(true)
    expect(isRecordableFocus(el(false), false)).toBe(false)
    expect(isRecordableFocus(null, false)).toBe(false)
  })

  it('restores only while the focus still sits on the guest and the element still exists', () => {
    expect(shouldRestoreFocus(el(), true)).toBe(true)
    // The user clicked away themselves — the focus is theirs now.
    expect(shouldRestoreFocus(el(), false)).toBe(false)
    expect(shouldRestoreFocus(el(false), true)).toBe(false)
    expect(shouldRestoreFocus(null, true)).toBe(false)
  })

  it('gives the remembered element its focus back on release', () => {
    const c = createFocusCustody()
    const prompt = el()
    c.remember(prompt, false)
    expect(c.release(true)).toBe(true)
    expect(prompt.focus).toHaveBeenCalledTimes(1)
    // The slot is emptied, so a second release is a no-op rather than a stale re-focus.
    expect(c.release(true)).toBe(false)
  })

  it('keeps the FIRST remembered element across a second grant', () => {
    // A second grant before a release would otherwise record the guest itself as "where the user
    // was" — restoring onto it is the focus theft this exists to undo.
    const c = createFocusCustody()
    const prompt = el()
    c.remember(prompt, false)
    c.remember(el(), true)
    expect(c.held()).toBe(prompt)
  })

  it('does not restore when the drive never took the focus in the first place', () => {
    const c = createFocusCustody()
    c.remember(el(), true) // focus was already inside a browser surface: nothing recordable
    expect(c.release(true)).toBe(false)
  })
})
