import { toast as sonnerToast, type ExternalToast } from 'sonner'

const ERROR_DURATION = 8000

/**
 * Thin wrapper around sonner's toast that sets error duration to 8s.
 * Success/info/warning use the Toaster default (4s).
 */
export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    success: sonnerToast.success,
    info: sonnerToast.info,
    warning: sonnerToast.warning,
    error: (message: string | React.ReactNode, data?: ExternalToast) =>
      sonnerToast.error(message, { duration: ERROR_DURATION, ...data }),
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    message: sonnerToast.message,
    custom: sonnerToast.custom,
  }
)
