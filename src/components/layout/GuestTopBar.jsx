export default function GuestTopBar({ authBusy, onSignIn }) {
  return (
    <div className="guest-top">
      <p className="guest-top-hint">로그인하면 사주를 저장할 수 있어요</p>
      <button
        type="button"
        className="guest-login-btn"
        disabled={authBusy}
        onClick={onSignIn}
      >
        {authBusy ? '이동 중…' : 'Google로 로그인'}
      </button>
    </div>
  )
}
