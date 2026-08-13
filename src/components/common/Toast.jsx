export default function Toast({ toast }) {
  if (!toast?.message) return null

  return (
    <div
      className={toast.leaving ? 'toast toast-leave' : 'toast'}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  )
}
