import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { analyzeSaju } from './gemini'
import { supabase } from './supabase'
import { useAuth } from './useAuth'

const READING_SELECT =
  'id, user_id, name, birth_date, birth_time, gender, calendar_type, result, created_at, updated_at'

/** 단일 줄바꿈을 마크다운 강제 줄바꿈으로 바꿔 원국·문단이 예쁘게 보이게 함 */
function formatResultMarkdown(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\n(?!\n)/g, '$1  \n')
}

function formatBirthDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  if (!y || !m || !d) return value
  return `${y}.${m}.${d}`
}

function genderLabel(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return ''
}

function calendarLabel(value) {
  if (value === 'lunar') return '음력'
  if (value === 'solar') return '양력'
  return ''
}

function App() {
  const { user, authLoading, authBusy, authError, signInWithGoogle, signOut } = useAuth()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [listLoading, setListLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [listError, setListError] = useState('')

  const resultRef = useRef(null)
  const nameInputRef = useRef(null)
  const formRef = useRef(null)
  const copyTimerRef = useRef(null)
  const shouldScrollToResultRef = useRef(false)

  const isViewingSaved = Boolean(selectedId)
  const busy = loading || saving || Boolean(deletingId)
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '사용자'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setReadings([])
      setSelectedId(null)
      setResult('')
      setListError('')
      setListLoading(false)
      return
    }
    void loadReadings()
  }, [user?.id])

  useEffect(() => {
    if (!shouldScrollToResultRef.current || !result || !resultRef.current) return
    shouldScrollToResultRef.current = false
    resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId, result])

  function readingPayload(extra = {}) {
    return {
      user_id: user.id,
      name: name.trim(),
      birth_date: birthDate,
      birth_time: timeUnknown || !birthTime ? null : birthTime,
      gender,
      calendar_type: calendarType,
      ...extra,
    }
  }

  async function loadReadings() {
    if (!user?.id) return
    setListLoading(true)
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select(READING_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      setListError('저장된 사주 목록을 불러오지 못했습니다.')
      setListLoading(false)
      return
    }

    setListError('')
    setReadings(data ?? [])
    setListLoading(false)
  }

  function markDirty() {
    setIsDirty(true)
    setNotice('')
  }

  function updateName(value) {
    markDirty()
    setName(value)
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }))
  }

  function updateBirthDate(value) {
    markDirty()
    setBirthDate(value)
    if (fieldErrors.birthDate) setFieldErrors((prev) => ({ ...prev, birthDate: false }))
  }

  function updateBirthTime(value) {
    markDirty()
    setTimeUnknown(false)
    setBirthTime(value)
  }

  function updateTimeUnknown(checked) {
    markDirty()
    setTimeUnknown(checked)
    if (checked) setBirthTime('')
  }

  function updateGender(value) {
    markDirty()
    setGender(value)
    if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: false }))
  }

  function updateCalendarType(value) {
    markDirty()
    setCalendarType(value)
  }

  function applyReading(reading) {
    shouldScrollToResultRef.current = true
    setSelectedId(reading.id)
    setName(reading.name ?? '')
    setBirthDate(reading.birth_date ?? '')
    const hasTime = Boolean(reading.birth_time)
    setTimeUnknown(!hasTime)
    setBirthTime(hasTime ? String(reading.birth_time).slice(0, 5) : '')
    setGender(reading.gender ?? '')
    setCalendarType(reading.calendar_type ?? 'solar')
    setResult(reading.result ?? '')
    setError('')
    setNotice('')
    setFieldErrors({})
    setCopied(false)
    setIsDirty(false)
  }

  function startNewReading() {
    setSelectedId(null)
    setName('')
    setBirthDate('')
    setBirthTime('')
    setTimeUnknown(false)
    setGender('')
    setCalendarType('solar')
    setResult('')
    setError('')
    setNotice('')
    setFieldErrors({})
    setCopied(false)
    setIsDirty(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function validateForm() {
    const next = {
      name: !name.trim(),
      birthDate: !birthDate,
      gender: !gender,
    }
    setFieldErrors(next)
    return !next.name && !next.birthDate && !next.gender
  }

  /** Create / Update: 사주 풀이 후 새 저장 또는 기존 행 갱신 */
  async function handleAnalyze(event) {
    event?.preventDefault()

    if (!user) {
      setError('Google 로그인 후 이용해 주세요.')
      return
    }

    if (!validateForm()) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    const editingId = selectedId
    setLoading(true)
    setError('')
    setNotice('')
    setResult('')
    setCopied(false)

    try {
      const text = await analyzeSaju({
        name: name.trim(),
        birthDate,
        birthTime: timeUnknown ? '' : birthTime,
        gender,
        calendarType,
      })
      shouldScrollToResultRef.current = true
      setResult(text)

      const payload = readingPayload({ result: text })

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('saju_readings')
          .update(payload)
          .eq('id', editingId)
          .select(READING_SELECT)
          .single()

        if (updateError) {
          console.error(updateError)
          setError('사주 해석은 됐지만 수정 저장에 실패했습니다.')
          return
        }

        setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        setSelectedId(data.id)
        setIsDirty(false)
        setNotice('저장본을 다시 풀어서 수정했습니다.')
      } else {
        const { data, error: saveError } = await supabase
          .from('saju_readings')
          .insert(payload)
          .select(READING_SELECT)
          .single()

        if (saveError) {
          console.error(saveError)
          setError('사주 해석은 됐지만 저장에 실패했습니다.')
          return
        }

        setReadings((prev) => [data, ...prev])
        setSelectedId(data.id)
        setIsDirty(false)
        setNotice('새 사주를 저장했습니다.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /** Update: 입력 정보만 기존 행에 저장 (결과 텍스트는 유지) */
  async function handleSaveInfo() {
    if (!user || !selectedId) return
    if (!validateForm()) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const { data, error: updateError } = await supabase
        .from('saju_readings')
        .update(readingPayload())
        .eq('id', selectedId)
        .select(READING_SELECT)
        .single()

      if (updateError) {
        console.error(updateError)
        setError('정보 수정에 실패했습니다.')
        return
      }

      setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setIsDirty(false)
      setNotice('입력 정보를 수정 저장했습니다.')
    } catch (err) {
      console.error(err)
      setError(err.message || '정보 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  /** Delete */
  async function handleDelete(readingId, readingName) {
    if (!user || !readingId) return
    const ok = window.confirm(
      `"${readingName || '이 사주'}" 저장본을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`,
    )
    if (!ok) return

    setDeletingId(readingId)
    setError('')
    setNotice('')

    try {
      const { error: deleteError } = await supabase
        .from('saju_readings')
        .delete()
        .eq('id', readingId)

      if (deleteError) {
        console.error(deleteError)
        setError('삭제에 실패했습니다.')
        return
      }

      setReadings((prev) => prev.filter((item) => item.id !== readingId))
      if (selectedId === readingId) {
        startNewReading()
        setNotice('저장본을 삭제했습니다.')
      } else {
        setNotice('저장본을 삭제했습니다.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCopyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
      setError('결과를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  const metaText = [
    formatBirthDate(birthDate),
    timeUnknown ? '시간 모름' : birthTime || null,
    genderLabel(gender),
    calendarLabel(calendarType),
  ]
    .filter(Boolean)
    .join(' · ')

  if (authLoading) {
    return (
      <div className="auth-screen">
        <p className="brand">saju-me</p>
        <p className="auth-lede">로그인 상태 확인 중…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <p className="brand">saju-me</p>
        <h1>사주 기록 시작하기</h1>
        <p className="auth-lede">Google 계정으로 로그인하면 내 사주를 저장하고 다시 볼 수 있어요.</p>
        <button
          type="button"
          className="google-login-btn"
          disabled={authBusy}
          onClick={() => void signInWithGoogle()}
        >
          {authBusy ? 'Google로 이동 중…' : 'Google로 계속하기'}
        </button>
        {(authError || error) && <p className="error">{authError || error}</p>}
      </div>
    )
  }

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <div className="sidebar-user">
          <div className="sidebar-user-profile">
            {avatarUrl ? (
              <img className="sidebar-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="sidebar-avatar sidebar-avatar-fallback" aria-hidden="true">
                {displayName.slice(0, 1)}
              </span>
            )}
            <p className="sidebar-user-name">{displayName}</p>
          </div>
          <button
            type="button"
            className="sidebar-logout"
            disabled={authBusy}
            onClick={() => void signOut()}
          >
            {authBusy ? '처리 중…' : '로그아웃'}
          </button>
        </div>
        <p className="sidebar-title">
          저장된 사주
          {!listLoading && !listError ? (
            <span className="sidebar-count">{readings.length}</span>
          ) : null}
        </p>
        <button type="button" className="sidebar-new" onClick={startNewReading}>
          새 사주 만들기
        </button>
        {listLoading && <p className="sidebar-empty">목록 불러오는 중…</p>}
        {listError && <p className="sidebar-error">{listError}</p>}
        {!listLoading && !listError && readings.length === 0 && (
          <p className="sidebar-empty">아직 저장된 사주가 없습니다.</p>
        )}
        <ul className="sidebar-list">
          {readings.map((reading) => (
            <li key={reading.id} className="sidebar-row">
              <button
                type="button"
                className={
                  selectedId === reading.id
                    ? 'sidebar-item sidebar-item-active'
                    : 'sidebar-item'
                }
                onClick={() => applyReading(reading)}
              >
                <span className="sidebar-item-name">{reading.name}</span>
                <span className="sidebar-item-meta">
                  {formatBirthDate(reading.birth_date)}
                </span>
              </button>
              <button
                type="button"
                className="sidebar-delete"
                disabled={busy}
                aria-label={`${reading.name} 삭제`}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete(reading.id, reading.name)
                }}
              >
                {deletingId === reading.id ? '…' : '삭제'}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="app">
        <p className="brand">saju-me</p>
        <h1>{isViewingSaved ? '저장된 사주' : '사주 입력'}</h1>
        <p className="lede">
          {isViewingSaved
            ? '저장본을 수정·다시 풀기·삭제할 수 있어요.'
            : '사주 계산에 필요한 기본 정보를 입력해 주세요.'}
        </p>

        {isViewingSaved && (
          <div className="mode-banner" role="status">
            <p>
              <strong>{name}</strong>님 저장본
              {isDirty ? ' · 수정 중' : ' 보는 중'}
            </p>
            <div className="mode-banner-actions">
              <button
                type="button"
                className="mode-banner-btn"
                disabled={busy || !isDirty}
                onClick={() => void handleSaveInfo()}
              >
                {saving ? '저장 중…' : '정보 저장'}
              </button>
              <button
                type="button"
                className="mode-banner-btn mode-banner-btn-danger"
                disabled={busy}
                onClick={() => void handleDelete(selectedId, name)}
              >
                삭제
              </button>
              <button type="button" className="mode-banner-btn" onClick={startNewReading}>
                새 사주
              </button>
            </div>
          </div>
        )}

        <form
          ref={formRef}
          className={isViewingSaved ? 'form-block form-block-viewing' : 'form-block'}
          onSubmit={handleAnalyze}
        >
          <fieldset disabled={busy}>
            <div className={fieldErrors.name ? 'field field-error' : 'field'}>
              <label htmlFor="name">이름</label>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                placeholder="예: 홍길동"
                autoComplete="name"
                value={name}
                onChange={(e) => updateName(e.target.value)}
              />
              {fieldErrors.name && <p className="field-hint">이름을 입력해 주세요.</p>}
            </div>

            <div className={fieldErrors.birthDate ? 'field field-error' : 'field'}>
              <label htmlFor="birthDate">생년월일</label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => updateBirthDate(e.target.value)}
              />
              {fieldErrors.birthDate && (
                <p className="field-hint">생년월일을 선택해 주세요.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="birthTime">태어난 시간</label>
              <input
                id="birthTime"
                type="time"
                value={birthTime}
                disabled={timeUnknown}
                onChange={(e) => updateBirthTime(e.target.value)}
              />
              <label className="time-unknown">
                <input
                  type="checkbox"
                  checked={timeUnknown}
                  onChange={(e) => updateTimeUnknown(e.target.checked)}
                />
                시간 모름
              </label>
            </div>

            <div className={fieldErrors.gender ? 'field field-error' : 'field'}>
              <span className="label" id="gender-label">
                성별
              </span>
              <div className="options" role="radiogroup" aria-labelledby="gender-label">
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => updateGender(e.target.value)}
                  />
                  남성
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => updateGender(e.target.value)}
                  />
                  여성
                </label>
              </div>
              {fieldErrors.gender && <p className="field-hint">성별을 선택해 주세요.</p>}
            </div>

            <div className="field">
              <span className="label" id="calendar-label">
                양력 / 음력
              </span>
              <div className="options" role="radiogroup" aria-labelledby="calendar-label">
                <label>
                  <input
                    type="radio"
                    name="calendarType"
                    value="solar"
                    checked={calendarType === 'solar'}
                    onChange={(e) => updateCalendarType(e.target.value)}
                  />
                  양력
                </label>
                <label>
                  <input
                    type="radio"
                    name="calendarType"
                    value="lunar"
                    checked={calendarType === 'lunar'}
                    onChange={(e) => updateCalendarType(e.target.value)}
                  />
                  음력
                </label>
              </div>
            </div>

            <button type="submit" className="analyze-btn" disabled={busy}>
              {loading ? (
                <span className="loading-label">
                  <span className="walker" aria-hidden="true">
                    <span className="walker-body" />
                  </span>
                  풀이중...
                </span>
              ) : isViewingSaved ? (
                '다시 풀어서 수정'
              ) : (
                '사주 보기'
              )}
            </button>
          </fieldset>
        </form>

        {error && <p className="error">{error}</p>}
        {notice && !error && <p className="notice">{notice}</p>}

        {result && (
          <div
            key={selectedId ?? `result-${result.slice(0, 24)}`}
            className="result"
            ref={resultRef}
          >
            <p className="result-eyebrow">RESULT</p>
            <h2>{name ? `${name} 사주 해석` : '사주 해석'}</h2>
            {metaText && <p className="result-meta">{metaText}</p>}

            <div className="result-actions">
              <button type="button" className="result-action" onClick={handleCopyResult}>
                {copied ? '복사됨' : '결과 복사'}
              </button>
              {isViewingSaved && (
                <button
                  type="button"
                  className="result-action result-action-danger"
                  disabled={busy}
                  onClick={() => void handleDelete(selectedId, name)}
                >
                  삭제
                </button>
              )}
              <button type="button" className="result-action" onClick={startNewReading}>
                새 사주 만들기
              </button>
            </div>

            <div className="result-text">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <span className="result-mark">{children}</span>
                  ),
                }}
              >
                {formatResultMarkdown(result)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
