import { GUEST_DRAFT_KEY } from './constants'

export function readGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // private mode 등에서 sessionStorage가 막혀도 흐름은 유지
  }
}

export function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}
