import { useEffect } from 'react'

/**
 * Hook to warn users before leaving/refreshing the page
 * Note: Modern browsers limit this functionality and may not show custom messages.
 * The browser will show its own generic warning dialog.
 * 
 * @param enabled - Whether to enable the warning
 * @param message - Optional message (may not be shown in all browsers)
 */
export function useBeforeUnload(enabled: boolean = true, message?: string) {
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern browsers ignore custom messages for security reasons
      // They show their own generic warning
      e.preventDefault()
      // Some browsers require returnValue to be set
      e.returnValue = message || 'Are you sure you want to leave? Your progress may be lost.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, message])
}

