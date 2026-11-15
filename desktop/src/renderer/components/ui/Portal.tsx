import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface PortalProps {
  children: ReactNode
  /** Portal target; defaults to `document.body`. */
  container?: HTMLElement | null
}

/**
 * Renders overlays at the end of `<body>` so they escape the app's stacking and
 * overflow contexts. Mounts one tick late so the portal target always exists.
 */
export function Portal({ children, container }: PortalProps): ReactNode {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(children, container ?? document.body)
}
