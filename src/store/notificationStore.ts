/**
 * KINGSTAR · IO — Notification Store (Zustand)
 * Toasts globais: sucesso, erro, info, alerta.
 * Auto-remove após 4s.
 */
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id:      string
  type:    ToastType
  message: string
}

interface NotificationState {
  toasts: Toast[]
  push:   (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],

  push: (type, message) => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, type, message }] })
    /* Auto-remove após 4 segundos */
    setTimeout(() => get().remove(id), 4000)
  },

  remove: (id) =>
    set({ toasts: get().toasts.filter(t => t.id !== id) }),
}))

/* Helper de conveniência: toast.success('ok'), toast.error('x') */
export const toast = {
  success: (m: string) => useNotificationStore.getState().push('success', m),
  error:   (m: string) => useNotificationStore.getState().push('error', m),
  info:    (m: string) => useNotificationStore.getState().push('info', m),
  warning: (m: string) => useNotificationStore.getState().push('warning', m),
}
