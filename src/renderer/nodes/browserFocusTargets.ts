/**
 * Module-level registry of the live `<webview>` elements a browser node has on screen, so the
 * agent-control focus custody (Canvas) can grant one of them focus for the duration of a drive and
 * ask afterwards whether the focus is still sitting there.
 *
 * It is module-level for the same reason `copySubs` in the terminal is: the surfaces mount and
 * unmount independently of the Canvas effect that needs them, and ONE node id can legitimately have
 * TWO of them at once (the canvas node and the kanban card modal both render `BrowserSurface` with
 * the same id). Both are kept; the grant prefers a surface that can actually take focus.
 */
export interface BrowserFocusTarget {
  /** The `<webview>` element, or null once it has gone (discarded / unmounted). */
  el(): (HTMLElement & { focus(): void }) | null
}

const targets = new Map<string, Set<BrowserFocusTarget>>()

export function registerBrowserFocusTarget(nodeId: string, t: BrowserFocusTarget): () => void {
  const set = targets.get(nodeId) ?? new Set<BrowserFocusTarget>()
  set.add(t)
  targets.set(nodeId, set)
  return () => {
    const live = targets.get(nodeId)
    if (!live) return
    live.delete(t)
    if (live.size === 0) targets.delete(nodeId)
  }
}

/** Every live element for this node, newest registration last. */
export function browserFocusElements(nodeId: string): (HTMLElement & { focus(): void })[] {
  const set = targets.get(nodeId)
  if (!set) return []
  const out: (HTMLElement & { focus(): void })[] = []
  for (const t of set) {
    const el = t.el()
    if (el && el.isConnected) out.push(el)
  }
  return out
}

/**
 * Give a node's guest the app's keyboard focus so a CDP `Input.*` dispatch lands
 * ([MEASURED] — see `actionNeedsGuestFocus`). Returns the element that took it, or null when there
 * is nothing focusable: a background project's keep-alive ghost is `display:none` and cannot be
 * focused — and does not need to be, because a hidden guest is still fully drivable.
 */
export function grantBrowserFocus(nodeId: string): HTMLElement | null {
  for (const el of browserFocusElements(nodeId)) {
    el.focus()
    if (document.activeElement === el) return el
  }
  return null
}

/** Is the app's focus currently on one of this node's guests? */
export function focusIsOnBrowserNode(nodeId: string): boolean {
  const active = document.activeElement
  return browserFocusElements(nodeId).some((el) => el === active)
}

/** Is this element part of ANY registered browser surface? Used to keep a guest from being recorded
 *  as "where the user was" — restoring onto it would re-steal the focus a drive later. */
export function isBrowserSurfaceElement(el: Element | null): boolean {
  if (!el) return false
  for (const set of targets.values()) {
    for (const t of set) {
      const node = t.el()
      if (node && (node === el || node.contains(el))) return true
    }
  }
  return false
}
