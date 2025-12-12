import { useState, useCallback } from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface ToastMessage {
  id: string
  message: string
  severity: AlertColor
  duration?: number
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, severity: AlertColor = 'info', duration: number = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const newToast: ToastMessage = { id, message, severity, duration }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ 
            top: `${24 + index * 70}px !important`,
            zIndex: 10000
          }}
        >
          <Alert 
            onClose={() => removeToast(toast.id)} 
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )

  return { showToast, ToastContainer }
}

