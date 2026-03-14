import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import { CheckOk } from '../lib/icons'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2800)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-2xl animate-slide-in">
      <CheckOk size={14} className="text-emerald-400 flex-shrink-0" />
      {message}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} message={t.message} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
