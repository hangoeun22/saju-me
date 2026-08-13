import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Mascot from './Mascot'
import {
  UUID_RE,
  formatResultMarkdown,
  readingMetaText,
  shareReadingLink,
} from './readingShare'
import { supabase } from './supabase'

export default function ResultPage({ readingId }) {
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const copyTimerRef = useRef(null)
  const shareTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
    }
  }, [])

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

      const { data, error: fetchError } = await supabase.rpc('get_shared_saju', {
        p_id: readingId,
      })

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
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800)
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
      if (outcome.copied) {
        setLinkCopied(true)
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
        shareTimerRef.current = setTimeout(() => setLinkCopied(false), 1800)
      }
    } catch (err) {
      console.error(err)
      setError('share-failed')
    }
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <a className="brand brand-link" href="/">
          saju-me
        </a>
        <Mascot caption="결과 찾는 중!" className="mascot-auth" />
        <p className="auth-lede">공유된 사주를 불러오고 있어요.</p>
      </div>
    )
  }

  if (!reading) {
    const message =
      error === 'load-failed'
        ? '사주 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        : '공유된 사주 결과를 찾을 수 없어요. 링크가 잘못됐거나 삭제됐을 수 있어요.'

    return (
      <div className="auth-screen">
        <a className="brand brand-link" href="/">
          saju-me
        </a>
        <Mascot caption="결과가 없어요" className="mascot-auth" />
        <h1>사주를 찾을 수 없어요</h1>
        <p className="auth-lede">{message}</p>
        <a className="google-login-btn result-page-home-btn" href="/">
          내 사주 보러 가기
        </a>
      </div>
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

      <div className="result">
        <div className="result-mascot-wrap">
          <Mascot caption="가격 5000만냥!!" size="lg" className="mascot-pop" />
        </div>
        <p className="result-eyebrow">RESULT</p>
        <h2>{reading.name ? `${reading.name} 사주 해석` : '사주 해석'}</h2>
        {metaText ? <p className="result-meta">{metaText}</p> : null}

        <div className="result-actions">
          <button type="button" className="result-action" onClick={() => void handleShare()}>
            {linkCopied ? '링크 복사됨' : '공유하기'}
          </button>
          <button type="button" className="result-action" onClick={() => void handleCopyResult()}>
            {copied ? '복사됨' : '결과 복사'}
          </button>
        </div>

        {statusError ? <p className="error">{statusError}</p> : null}

        <div className="result-text">
          <ReactMarkdown
            components={{
              strong: ({ children }) => <span className="result-mark">{children}</span>,
            }}
          >
            {formatResultMarkdown(reading.result)}
          </ReactMarkdown>
        </div>
      </div>

      <a className="result-page-cta" href="/">
        나도 사주 보기
      </a>
      <p className="result-page-note">로그인하면 내 사주도 저장하고 친구에게 공유할 수 있어요.</p>
    </div>
  )
}
