import Mascot from '../common/Mascot'

export default function ResultCard({
  resultRef,
  name,
  metaText,
  actions,
  children,
}) {
  return (
    <div className="result" ref={resultRef}>
      <div className="result-mascot-wrap">
        <Mascot caption="가격 5000만냥!!" size="lg" className="mascot-pop" />
      </div>
      <p className="result-eyebrow">RESULT</p>
      <h2>{name ? `${name} 사주 해석` : '사주 해석'}</h2>
      {metaText ? <p className="result-meta">{metaText}</p> : null}
      {actions ? <div className="result-actions">{actions}</div> : null}
      {children}
    </div>
  )
}
