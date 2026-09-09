/**
 * The renderer half of browser-drive focus custody: remember what the USER was focused on before an
 * agent drove a browser node, and put it back when the drive is over.
 *
 * The decisions live here, pure, because both of them are easy to get subtly wrong:
 *   - What may be REMEMBERED: never a `<webview>` (or anything inside a browser node). Recording the
 *     guest as "where the user was" would make the restore re-focus the very element we are trying
 *     to stop stealing focus, one drive later.
 *   - When to RESTORE: only while the focus still sits where the drive put it, and only if the
 *     remembered element is still in the document. If the user has clicked somewhere themselves
 *     since — including into that browser node on purpose — the drive has no business moving focus.
 *
 * The DOM is passed in rather than read from globals so this is testable under vitest's `node`
 * environment, and so the caller decides which document it means (the canvas and the kanban card
 * modal both host browser surfaces).
 */

/** The minimum of an element this module needs. */
export interface FocusTarget {
  focus(): void
  isConnected: boolean
}

export interface CustodyDoc {
  activeElement: FocusTarget | null
}

/**
 * May this element be remembered as "where the user was"? `insideDriven` says the element belongs to
 * a browser surface (the caller matches it against the driven node's subtree) — that is exactly what
 * must not be recorded.
 */
export function isRecordableFocus(el: FocusTarget | null, insideBrowserSurface: boolean): boolean {
  return el !== null && el.isConnected && !insideBrowserSurface
}

/**
 * Should the drive put focus back? `focusIsOnGuest` is the caller's answer to "is the current
 * activeElement the webview we just drove" — anything else means the user moved on and owns the
 * focus now.
 */
export function shouldRestoreFocus(
  saved: FocusTarget | null,
  focusIsOnGuest: boolean
): saved is FocusTarget {
  return saved !== null && saved.isConnected && focusIsOnGuest
}

/**
 * The mutable custody slot. One per app: a drive is one action at a time (main serialises the verb),
 * and a second grant before a release simply keeps the first, older, user-owned element — the one
 * the user actually wants back.
 */
export function createFocusCustody() {
  let saved: FocusTarget | null = null
  return {
    /** Remember the current focus before granting the guest focus. A second call while one is held
     *  keeps the FIRST: it is the user's element; the second would be the guest itself. */
    remember(el: FocusTarget | null, insideBrowserSurface: boolean): void {
      if (saved && saved.isConnected) return
      saved = isRecordableFocus(el, insideBrowserSurface) ? el : null
    },
    /** Put the focus back if it is still ours to put back. Returns whether it did. */
    release(focusIsOnGuest: boolean): boolean {
      const el = saved
      saved = null
      if (!shouldRestoreFocus(el, focusIsOnGuest)) return false
      el.focus()
      return true
    },
    /** Test/inspection seam. */
    held(): FocusTarget | null {
      return saved
    }
  }
}

export type FocusCustody = ReturnType<typeof createFocusCustody>
