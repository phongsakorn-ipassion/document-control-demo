import { useRef, useEffect, useCallback } from 'react'

/**
 * Reusable infinite scroll hook using IntersectionObserver.
 * Returns a `sentinelRef` to attach to a sentinel element at the bottom of a list.
 * When the sentinel becomes visible, `onLoadMore` is called.
 */
export function useInfiniteScroll(onLoadMore, { enabled = true } = {}) {
  const sentinelRef = useRef(null)
  const callbackRef = useRef(onLoadMore)
  callbackRef.current = onLoadMore

  useEffect(() => {
    if (!enabled) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callbackRef.current()
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  return sentinelRef
}
