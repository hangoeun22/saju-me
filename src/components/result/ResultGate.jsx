import Mascot from '../common/Mascot'

export default function ResultGate({ authBusy, authError, onSignIn }) {
  return (
    <div className="result-gate">
      <div className="result-gate-fade" />
      <div className="result-gate-card">
        <Mascot caption="나머진 비밀!" className="mascot-gate" />
        <h3>나머지 해석이 궁금하다면</h3>
        <p>
          Google로 로그인하면 전체 사주를 볼 수 있고,
          저장해서 나중에 다시 꺼내볼 수도 있어요.
        </p>
        <button
          type="button"
          className="google-login-btn"
          disabled={authBusy}
          onClick={onSignIn}
        >
          {authBusy ? 'Google로 이동 중…' : 'Google로 계속하기'}
        </button>
        {authError && <p className="error">{authError}</p>}
      </div>
    </div>
  )
}
