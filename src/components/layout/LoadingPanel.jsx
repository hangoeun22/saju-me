import Mascot from '../common/Mascot'

export default function LoadingPanel() {
  return (
    <div className="mascot-loading-panel" aria-live="polite">
      <Mascot caption="분석 중!" size="lg" className="mascot-bounce" />
      <p className="mascot-loading-hint">사주를 열심히 읽고 있어요</p>
    </div>
  )
}
