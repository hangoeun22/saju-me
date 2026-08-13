import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { analyzeSaju } from './gemini'
import Mascot from './Mascot'
import ProfileModal from './ProfileModal'
import {
  calendarLabel,
  formatBirthDate,
  formatResultMarkdown,
  genderLabel,
  shareReadingLink,
} from './readingShare'
import { supabase } from './supabase'
import { useAuth } from './useAuth'

const READING_SELECT =
  'id, user_id, name, birth_date, birth_time, gender, calendar_type, result, created_at, updated_at'

const USER_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at'

const GUEST_DRAFT_KEY = 'saju-me:guest-draft'
const GUEST_PREVIEW_RATIO = 0.48

function readGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // private mode 등에서 sessionStorage가 막혀도 흐름은 유지
  }
}

function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}

function splitGatedResult(text, ratio = GUEST_PREVIEW_RATIO) {
  const full = String(text ?? '')
  if (!full) return { preview: '', teaser: '' }

  const target = Math.max(220, Math.floor(full.length * ratio))
  if (full.length <= target) {
    const cut = Math.max(80, Math.floor(full.length * ratio))
    return {
      preview: full.slice(0, cut).trimEnd(),
      teaser: full.slice(cut).trimStart(),
    }
  }

  const windowStart = Math.floor(target * 0.62)
  const para = full.lastIndexOf('\n\n', target)
  const heading = full.lastIndexOf('\n#', target)
  let cut = target
  if (para >= windowStart) cut = para
  else if (heading >= windowStart) cut = heading
  else {
    const line = full.lastIndexOf('\n', target)
    if (line >= windowStart) cut = line
  }

  const preview = full.slice(0, cut).trimEnd()
  const rest = full.slice(cut).trimStart()
  const teaserLen = Math.min(rest.length, Math.max(140, Math.floor(full.length * 0.16)))
  let teaserCut = teaserLen
  const teaserPara = rest.indexOf('\n\n', Math.floor(teaserLen * 0.4))
  if (teaserPara > 0 && teaserPara < teaserLen + 90) teaserCut = teaserPara

  return { preview, teaser: rest.slice(0, teaserCut).trimEnd() }
}

function profileToForm(profile) {
  const hasTime = Boolean(profile?.birth_time)
  return {
    name: profile?.name ?? '',
    birthDate: profile?.birth_date ?? '',
    birthTime: hasTime ? String(profile.birth_time).slice(0, 5) : '',
    timeUnknown: profile ? !hasTime : false,
    gender: profile?.gender ?? '',
    calendarType: profile?.calendar_type ?? 'solar',
  }
}

function App() {
  const { user, authLoading, authBusy, authError, signInWithGoogle, signOut } = useAuth()

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileRequired, setProfileRequired] = useState(false)

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
  const [toast, setToast] = useState({ message: '', leaving: false })
  const [fieldErrors, setFieldErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [listError, setListError] = useState('')

  const resultRef = useRef(null)
  const nameInputRef = useRef(null)
  const formRef = useRef(null)
  const copyTimerRef = useRef(null)
  const shareTimerRef = useRef(null)
  const toastShowTimerRef = useRef(null)
  const toastHideTimerRef = useRef(null)
  const shouldScrollToResultRef = useRef(false)

  const isGuest = !user
  const isViewingSaved = Boolean(selectedId)
  const busy = loading || saving || Boolean(deletingId) || profileSaving
  const displayName =
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '사용자'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const profileReady = Boolean(profile)
  const canSubmit = !busy && (isGuest || profileReady)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
      if (toastShowTimerRef.current) clearTimeout(toastShowTimerRef.current)
      if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileRequired(false)
      setShowProfileModal(false)
      setReadings([])
      setSelectedId(null)
      setListError('')
      setListLoading(false)
      setProfileLoading(false)

      const draft = readGuestDraft()
      if (draft) {
        applyDraftToForm(draft)
        setResult(draft.result ?? '')
        if (draft.result) shouldScrollToResultRef.current = true
      } else {
        resetGuestForm()
      }
      return
    }
    void bootstrapUser()
  }, [user?.id])

  useEffect(() => {
    if (authLoading || (user && profileLoading)) return
    if (!shouldScrollToResultRef.current || !result || !resultRef.current) return
    shouldScrollToResultRef.current = false
    resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId, result, authLoading, user, profileLoading])

  function applyProfileToForm(nextProfile) {
    const form = profileToForm(nextProfile)
    setName(form.name)
    setBirthDate(form.birthDate)
    setBirthTime(form.birthTime)
    setTimeUnknown(form.timeUnknown)
    setGender(form.gender)
    setCalendarType(form.calendarType)
    setIsDirty(false)
    setFieldErrors({})
  }

  function applyDraftToForm(draft) {
    setName(draft?.name ?? '')
    setBirthDate(draft?.birthDate ?? '')
    setBirthTime(draft?.birthTime ?? '')
    setTimeUnknown(Boolean(draft?.timeUnknown))
    setGender(draft?.gender ?? '')
    setCalendarType(draft?.calendarType ?? 'solar')
    setIsDirty(false)
    setFieldErrors({})
  }

  function resetGuestForm() {
    setName('')
    setBirthDate('')
    setBirthTime('')
    setTimeUnknown(false)
    setGender('')
    setCalendarType('solar')
    setResult('')
    setIsDirty(false)
    setFieldErrors({})
    setCopied(false)
    setLinkCopied(false)
  }

  function persistGuestDraft(extra = {}) {
    writeGuestDraft({
      name: name.trim(),
      birthDate,
      birthTime,
      timeUnknown,
      gender,
      calendarType,
      result,
      ...extra,
    })
  }

  function handleGuestSignIn() {
    persistGuestDraft()
    void signInWithGoogle()
  }

  async function saveDraftReading(draft) {
    if (!user?.id || !draft?.result) {
      clearGuestDraft()
      return
    }

    const payload = {
      user_id: user.id,
      name: String(draft.name ?? '').trim(),
      birth_date: draft.birthDate,
      birth_time: draft.timeUnknown || !draft.birthTime ? null : draft.birthTime,
      gender: draft.gender,
      calendar_type: draft.calendarType ?? 'solar',
      result: draft.result,
    }

    const { data, error: saveError } = await supabase
      .from('saju_readings')
      .insert(payload)
      .select(READING_SELECT)
      .single()

    if (saveError) {
      console.error(saveError)
      setError('전체 해석은 열렸지만 저장에 실패했습니다.')
      clearGuestDraft()
      return
    }

    setReadings((prev) => [data, ...prev])
    setSelectedId(data.id)
    setIsDirty(false)
    setNotice('전체 해석이 열렸어요. 이 사주를 저장해 두었습니다.')
    clearGuestDraft()
  }

  async function bootstrapUser() {
    setProfileLoading(true)
    setError('')

    const draft = readGuestDraft()
    if (draft) {
      applyDraftToForm(draft)
      if (draft.result) {
        shouldScrollToResultRef.current = true
        setResult(draft.result)
      }
    }

    const { data, error: profileError } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error(profileError)
      setError('프로필을 불러오지 못했습니다.')
      setProfileLoading(false)
      return
    }

    let nextProfile = data

    if (!nextProfile && draft?.name && draft?.birthDate && draft?.gender) {
      const payload = {
        name: String(draft.name).trim(),
        birth_date: draft.birthDate,
        birth_time: draft.timeUnknown || !draft.birthTime ? null : draft.birthTime,
        gender: draft.gender,
        calendar_type: draft.calendarType ?? 'solar',
      }
      const { data: created, error: createError } = await supabase
        .from('users')
        .upsert({ id: user.id, ...payload }, { onConflict: 'id' })
        .select(USER_SELECT)
        .single()

      if (createError) {
        console.error(createError)
        setProfile(null)
        setProfileRequired(true)
        setShowProfileModal(true)
        setProfileLoading(false)
        setReadings([])
        return
      }

      nextProfile = created
    }

    if (!nextProfile) {
      setProfile(null)
      setProfileRequired(true)
      setShowProfileModal(true)
      setProfileLoading(false)
      setReadings([])
      return
    }

    setProfile(nextProfile)
    setProfileRequired(false)
    setShowProfileModal(false)
    if (!draft) {
      applyProfileToForm(nextProfile)
    }
    setProfileLoading(false)
    await loadReadings()

    if (draft?.result) {
      await saveDraftReading(draft)
    } else if (draft) {
      clearGuestDraft()
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
    setLinkCopied(false)
    setIsDirty(false)
  }

  function showToast(message) {
    if (toastShowTimerRef.current) clearTimeout(toastShowTimerRef.current)
    if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current)

    setToast({ message, leaving: false })

    toastShowTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev.message ? { ...prev, leaving: true } : prev))
      toastHideTimerRef.current = setTimeout(() => {
        setToast({ message: '', leaving: false })
      }, 320)
    }, 2200)
  }

  function startNewReading() {
    const alreadyOnNewPage = !selectedId && !result

    if (alreadyOnNewPage) {
      showToast('이미 새 사주 화면이 열려 있어요.')
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      requestAnimationFrame(() => nameInputRef.current?.focus())
      return
    }

    setSelectedId(null)
    setResult('')
    setError('')
    setNotice('')
    setCopied(false)
    setLinkCopied(false)
    if (profile) {
      applyProfileToForm(profile)
    } else if (isGuest) {
      setCopied(false)
      setIsDirty(false)
      persistGuestDraft({ result: '' })
    } else {
      resetGuestForm()
      clearGuestDraft()
    }
    showToast('내 사주 입력 화면으로 이동했어요.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function openProfileEditor() {
    setProfileRequired(false)
    setShowProfileModal(true)
  }

  async function handleSaveProfile(payload) {
    if (!user) return
    setProfileSaving(true)
    setError('')
    setNotice('')

    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          ...payload,
        },
        { onConflict: 'id' },
      )
      .select(USER_SELECT)
      .single()

    setProfileSaving(false)

    if (saveError) {
      console.error(saveError)
      setError('프로필 저장에 실패했습니다.')
      return
    }

    const wasFirstSetup = !profile
    setProfile(data)
    setProfileRequired(false)
    setShowProfileModal(false)

    if (!selectedId) {
      applyProfileToForm(data)
    }

    setNotice(wasFirstSetup ? '프로필을 등록했습니다. 사주를 볼 수 있어요.' : '프로필을 수정했습니다.')

    if (wasFirstSetup) {
      await loadReadings()
      const draft = readGuestDraft()
      if (draft?.result) {
        await saveDraftReading(draft)
      } else {
        clearGuestDraft()
      }
    }
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

  async function handleAnalyze(event) {
    event?.preventDefault()

    if (!validateForm()) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (user && !profile) {
      setProfileRequired(true)
      setShowProfileModal(true)
      setError('먼저 프로필을 등록해 주세요.')
      return
    }

    const editingId = selectedId
    setLoading(true)
    setError('')
    setNotice('')
    setResult('')
    setCopied(false)
    setLinkCopied(false)

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

      if (!user) {
        persistGuestDraft({ result: text })
        return
      }

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
      }
      setNotice('저장본을 삭제했습니다.')
    } catch (err) {
      console.error(err)
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCopyResult() {
    if (!result || isGuest) return
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

  async function handleShareResult() {
    if (!selectedId) return
    try {
      const outcome = await shareReadingLink({ id: selectedId, name })
      if (outcome.copied) {
        setLinkCopied(true)
        showToast('공유 링크를 복사했어요.')
        if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
        shareTimerRef.current = setTimeout(() => setLinkCopied(false), 1800)
      }
    } catch (err) {
      console.error(err)
      setError('공유에 실패했습니다. 브라우저 권한을 확인해 주세요.')
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

  const profileSummary = profile
    ? [
        formatBirthDate(profile.birth_date),
        profile.birth_time ? String(profile.birth_time).slice(0, 5) : '시간 모름',
        genderLabel(profile.gender),
        calendarLabel(profile.calendar_type),
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const gatedResult = isGuest && Boolean(result)
  const gatedParts = gatedResult ? splitGatedResult(result) : { preview: result, teaser: '' }

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="auth-screen">
        <p className="brand">saju-me</p>
        <Mascot caption="분석 중!" className="mascot-auth" />
        <p className="auth-lede">
          {authLoading ? '로그인 상태 확인 중…' : '프로필 불러오는 중…'}
        </p>
      </div>
    )
  }

  return (
    <div className={isGuest ? 'layout layout-guest' : 'layout'}>
      {isGuest ? (
        <div className="guest-top">
          <p className="guest-top-hint">로그인하면 사주를 저장할 수 있어요</p>
          <button
            type="button"
            className="guest-login-btn"
            disabled={authBusy}
            onClick={handleGuestSignIn}
          >
            {authBusy ? '이동 중…' : 'Google로 로그인'}
          </button>
        </div>
      ) : (
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
            <div className="sidebar-user-copy">
              <p className="sidebar-user-name">{displayName}</p>
              {profileSummary ? <p className="sidebar-user-meta">{profileSummary}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="sidebar-profile-btn"
            disabled={!profileReady && profileRequired}
            onClick={openProfileEditor}
          >
            프로필 수정
          </button>
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
          {profileReady && !listLoading && !listError ? (
            <span className="sidebar-count">{readings.length}</span>
          ) : null}
        </p>
        <button
          type="button"
          className="sidebar-new"
          onClick={startNewReading}
          disabled={!profileReady}
        >
          내 사주로 풀기
        </button>
        {!profileReady && (
          <p className="sidebar-empty">프로필 등록 후 사주를 볼 수 있어요.</p>
        )}
        {profileReady && listLoading && <p className="sidebar-empty">목록 불러오는 중…</p>}
        {profileReady && listError && <p className="sidebar-error">{listError}</p>}
        {profileReady && !listLoading && !listError && readings.length === 0 && (
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
      )}

      <div className="app">
        <p className="brand">saju-me</p>
        {isGuest && !result && !loading && (
          <Mascot caption="사주 같이 볼까?" className="mascot-welcome" />
        )}
        <h1>{isViewingSaved ? '저장된 사주' : '내 사주 보기'}</h1>
        <p className="lede">
          {isViewingSaved
            ? '과거 결과 스냅샷을 보고 있어요. 프로필과 별도로 저장된 기록입니다.'
            : isGuest
              ? '로그인 없이 바로 볼 수 있어요. 이름과 생년월일을 입력해 주세요.'
              : profileReady
                ? '프로필 정보가 자동으로 채워져 있어요. 바로 사주를 볼 수 있습니다.'
                : '먼저 프로필을 등록해 주세요.'}
        </p>
        {isGuest && authError && <p className="error">{authError}</p>}

        {profileReady && !isViewingSaved && (
          <div className="profile-chip" role="status">
            <div>
              <p className="profile-chip-label">내 프로필</p>
              <p className="profile-chip-text">
                <strong>{profile.name}</strong>
                {profileSummary ? ` · ${profileSummary}` : ''}
              </p>
            </div>
            <button type="button" className="mode-banner-btn" onClick={openProfileEditor}>
              수정
            </button>
          </div>
        )}

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
                내 사주로
              </button>
            </div>
          </div>
        )}

        <form
          ref={formRef}
          className={isViewingSaved ? 'form-block form-block-viewing' : 'form-block'}
          onSubmit={handleAnalyze}
        >
          <fieldset disabled={busy || (!isGuest && !profileReady)}>
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

            <button type="submit" className="analyze-btn" disabled={!canSubmit}>
              {loading ? (
                <span className="loading-label">풀이중...</span>
              ) : isViewingSaved ? (
                '다시 풀어서 수정'
              ) : (
                '사주 보기'
              )}
            </button>
          </fieldset>
        </form>

        {loading && (
          <div className="mascot-loading-panel" aria-live="polite">
            <Mascot caption="분석 중!" size="lg" className="mascot-bounce" />
            <p className="mascot-loading-hint">사주를 열심히 읽고 있어요</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {notice && !error && <p className="notice">{notice}</p>}

        {result && (
          <div
            key={selectedId ?? `result-${result.slice(0, 24)}`}
            className="result"
            ref={resultRef}
          >
            <div className="result-mascot-wrap">
              <Mascot caption="가격 5000만냥!!" size="lg" className="mascot-pop" />
            </div>
            <p className="result-eyebrow">RESULT</p>
            <h2>{name ? `${name} 사주 해석` : '사주 해석'}</h2>
            {metaText && <p className="result-meta">{metaText}</p>}

            <div className="result-actions">
              {selectedId && (
                <button
                  type="button"
                  className="result-action"
                  onClick={() => void handleShareResult()}
                >
                  {linkCopied ? '링크 복사됨' : '공유하기'}
                </button>
              )}
              {!gatedResult && (
                <button type="button" className="result-action" onClick={handleCopyResult}>
                  {copied ? '복사됨' : '결과 복사'}
                </button>
              )}
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
                {gatedResult ? '다시 입력하기' : '내 사주로 풀기'}
              </button>
            </div>

            <div className={gatedResult ? 'result-body result-body-gated' : 'result-body'}>
              <div className="result-text">
                <ReactMarkdown
                  components={{
                    strong: ({ children }) => (
                      <span className="result-mark">{children}</span>
                    ),
                  }}
                >
                  {formatResultMarkdown(gatedParts.preview || result)}
                </ReactMarkdown>
              </div>

              {gatedResult && gatedParts.teaser && (
                <div className="result-text result-teaser" aria-hidden="true">
                  <ReactMarkdown>
                    {formatResultMarkdown(gatedParts.teaser)}
                  </ReactMarkdown>
                </div>
              )}

              {gatedResult && (
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
                      onClick={handleGuestSignIn}
                    >
                      {authBusy ? 'Google로 이동 중…' : 'Google로 계속하기'}
                    </button>
                    {authError && <p className="error">{authError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ProfileModal
        open={showProfileModal}
        required={profileRequired}
        initialProfile={
          profile ??
          (name || birthDate || gender
            ? {
                name,
                birth_date: birthDate,
                birth_time: timeUnknown || !birthTime ? null : birthTime,
                gender,
                calendar_type: calendarType,
              }
            : null)
        }
        saving={profileSaving}
        onSave={handleSaveProfile}
        onClose={() => {
          if (profileRequired) return
          setShowProfileModal(false)
        }}
      />

      {toast.message && (
        <div
          className={toast.leaving ? 'toast toast-leave' : 'toast'}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
