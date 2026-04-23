export const GLOBAL_OVERLAY_EVENT = 'pinksundew:global-overlay'

export type GlobalOverlayDetail = {
  id: string
  open: boolean
}

export function dispatchGlobalOverlay(detail: GlobalOverlayDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent<GlobalOverlayDetail>(GLOBAL_OVERLAY_EVENT, { detail }))
}
