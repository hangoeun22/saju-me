import { useEffect } from 'react'
import ResultGate from './ResultGate'
import ResultCard from './ResultCard'
import ResultMarkdown from './ResultMarkdown'
import { trackEvent } from '../../lib/analytics'

export default function ResultPanel({
  resultRef,
  selectedId,
  name,
  metaText,
  resultText,
  gated,
  gatedParts,
  copied,
  linkCopied,
  isViewingSaved,
  busy,
  authBusy,
  authError,
  onShare,
  onCopy,
  onDelete,
  onNewReading,
  onSignIn,
}) {
  useEffect(() => {
    trackEvent('result_view', {
      gated,
      source: isViewingSaved ? 'saved' : 'fresh',
    })
    if (gated) trackEvent('result_gate_view')
  }, [gated, isViewingSaved])

  return (
    <ResultCard
      resultRef={resultRef}
      name={name}
      metaText={metaText}
      actions={
        <>
          {selectedId && (
            <button type="button" className="result-action" onClick={onShare}>
              {linkCopied ? '링크 복사됨' : '공유하기'}
            </button>
          )}
          {!gated && (
            <button type="button" className="result-action" onClick={onCopy}>
              {copied ? '복사됨' : '결과 복사'}
            </button>
          )}
          {isViewingSaved && (
            <button
              type="button"
              className="result-action result-action-danger"
              disabled={busy}
              onClick={onDelete}
            >
              삭제
            </button>
          )}
          <button type="button" className="result-action" onClick={onNewReading}>
            {gated ? '다시 입력하기' : '내 사주로 풀기'}
          </button>
        </>
      }
    >
      <div className={gated ? 'result-body result-body-gated' : 'result-body'}>
        <ResultMarkdown text={gatedParts.preview || resultText} />

        {gated && gatedParts.teaser && (
          <ResultMarkdown
            className="result-text result-teaser"
            text={gatedParts.teaser}
            hidden
          />
        )}

        {gated && (
          <ResultGate authBusy={authBusy} authError={authError} onSignIn={onSignIn} />
        )}
      </div>
    </ResultCard>
  )
}
