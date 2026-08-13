import { useEffect, useState } from 'react'
import AuthScreen from '../components/layout/AuthScreen'
import ResultCard from '../components/result/ResultCard'
import ResultMarkdown from '../components/result/ResultMarkdown'
import { useTimedFlag } from '../hooks/useTimedFlag'
import { trackEvent } from '../lib/analytics'
import { UUID_RE, readingMetaText, shareReadingLink } from '../lib/readingShare'
import { fetchSharedReading } from '../lib/readingsApi'

export default function ResultPage({ readingId }) {
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, pulseCopied] = useTimedFlag()
  const [linkCopied, pulseLinkCopied] = useTimedFlag()

  useEffect(() => {
    const previous = document.title
    if (reading?.name) {
      document.title = `${reading.name}님의 사주 | saju-me`
    } else if (!loading && error) {
      document.title = '사주를 찾을 수 없어요 | saju-me'
    }
    return () => {
      document.title = previous
    }
  }, [reading, loading, error])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      setReading(null)

      if (!UUID_RE.test(readingId || '')) {
        if (!cancelled) {
          setError('not-found')
          setLoading(false)
        }
        return
      }

      const { data, error: fetchError } = await fetchSharedReading(readingId)

      if (cancelled) return

      if (fetchError) {
        console.error(fetchError)
        setError('load-failed')
        setLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setError('not-found')
        setLoading(false)
        return
      }

      setReading(row)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [readingId])

  async function handleCopyResult() {
    if (!reading?.result) return
    try {
      await navigator.clipboard.writeText(reading.result)
      pulseCopied()
      trackEvent('reading_copy', { source: 'shared_page' })
    } catch (err) {
      console.error(err)
      setError('copy-failed')
    }
  }

  async function handleShare() {
    try {
      const outcome = await shareReadingLink({
        id: reading?.id || readingId,
        name: reading?.name,
      })
      if (outcome.cancelled) return
      trackEvent('share', {
        method: outcome.shared ? 'native' : 'copy_link',
        content_type: 'saju_reading',
        source: 'shared_page',
      })
      if (outcome.copied) {
        pulseLinkCopied()
      }
    } catch (err) {
      console.error(err)
      setError('share-failed')
    }
  }

  if (loading) {
    return (
      <AuthScreen
        brandAsLink
        caption="결과 찾는 중!"
        lede="공유된 사주를 불러오고 있어요."
      />
    )
  }

  if (!reading) {
    const message =
      error === 'load-failed'
        ? '사주 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        : '공유된 사주 결과를 찾을 수 없어요. 링크가 잘못됐거나 삭제됐을 수 있어요.'

    return (
      <AuthScreen
        brandAsLink
        caption="결과가 없어요"
        title="사주를 찾을 수 없어요"
        lede={message}
      >
        <a
          className="google-login-btn result-page-home-btn"
          href="/"
          onClick={() => trackEvent('cta_try_saju', { location: 'result_not_found' })}
        >
          내 사주 보러 가기
        </a>
      </AuthScreen>
    )
  }

  const metaText = readingMetaText({
    birthDate: reading.birth_date,
    birthTime: reading.birth_time,
    gender: reading.gender,
    calendarType: reading.calendar_type,
  })
  const statusError =
    error === 'copy-failed'
      ? '결과를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.'
      : error === 'share-failed'
        ? '공유에 실패했습니다. 브라우저 권한을 확인해 주세요.'
        : ''

  return (
    <div className="result-page">
      <a className="brand brand-link" href="/">
        saju-me
      </a>
      <h1>{reading.name ? `${reading.name}님의 사주` : '공유된 사주'}</h1>
      <p className="lede">친구가 공유한 사주 결과예요. 로그인 없이 볼 수 있어요.</p>

      <ResultCard
        name={reading.name}
        metaText={metaText}
        actions={
          <>
            <button type="button" className="result-action" onClick={() => void handleShare()}>
              {linkCopied ? '링크 복사됨' : '공유하기'}
            </button>
            <button type="button" className="result-action" onClick={() => void handleCopyResult()}>
              {copied ? '복사됨' : '결과 복사'}
            </button>
          </>
        }
      >
        {statusError ? <p className="error">{statusError}</p> : null}
        <ResultMarkdown text={reading.result} />
      </ResultCard>

      <a
        className="result-page-cta"
        href="/"
        onClick={() => trackEvent('cta_try_saju', { location: 'shared_result' })}
      >
        나도 사주 보기
      </a>
      <p className="result-page-note">로그인하면 내 사주도 저장하고 친구에게 공유할 수 있어요.</p>
    </div>
  )
}
