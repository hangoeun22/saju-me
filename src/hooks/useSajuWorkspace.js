import { useEffect, useRef, useState } from 'react'
import { analyzeSaju } from '../lib/gemini'
import { splitGatedResult } from '../lib/gatedResult'
import { clearGuestDraft, readGuestDraft, writeGuestDraft } from '../lib/guestDraft'
import { formToProfilePayload, profileToForm } from '../lib/profileForm'
import {
  calendarLabel,
  formatBirthDate,
  genderLabel,
  shareReadingLink,
} from '../lib/readingShare'
import {
  deleteReading,
  fetchProfile,
  fetchReadingCount,
  fetchReadings,
  insertReading,
  updateReading,
  upsertProfile,
} from '../lib/readingsApi'
import {
  classifyAnalyzeError,
  setUserProperties,
  trackEvent,
  trackException,
  trackLoginClick,
} from '../lib/analytics'
import { useAuth } from './useAuth'
import { useTimedFlag } from './useTimedFlag'
import { useToast } from './useToast'

export function useSajuWorkspace() {
  const { user, authLoading, authBusy, authError, signInWithGoogle, signOut } = useAuth()
  const { toast, showToast } = useToast()
  const [copied, pulseCopied, resetCopied] = useTimedFlag()
  const [linkCopied, pulseLinkCopied, resetLinkCopied] = useTimedFlag()

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
  const [fieldErrors, setFieldErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [listError, setListError] = useState('')
  const [readingCount, setReadingCount] = useState(null)

  const resultRef = useRef(null)
  const nameInputRef = useRef(null)
  const formRef = useRef(null)
  const shouldScrollToResultRef = useRef(false)
  const formStartedRef = useRef(false)

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
  const booting = authLoading || (user && profileLoading)

  useEffect(() => {
    void loadReadingCount()
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
      setUserProperties({ user_type: 'guest', has_profile: false })

      const draft = readGuestDraft()
      if (draft) {
        applyDraftToForm(draft)
        setResult(draft.result ?? '')
        if (draft.result) shouldScrollToResultRef.current = true
        trackEvent('guest_draft_restore', { has_result: Boolean(draft.result) })
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
    resetCopied()
    resetLinkCopied()
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

  function handleFormStart() {
    if (formStartedRef.current) return
    formStartedRef.current = true
    trackEvent('form_start', {
      form_id: 'saju_form',
      user_type: isGuest ? 'guest' : 'member',
    })
  }

  function handleGuestSignIn(location = 'unknown') {
    trackLoginClick(location)
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
      ...formToProfilePayload(draft),
      result: draft.result,
    }

    const { data, error: saveError } = await insertReading(payload)

    if (saveError) {
      console.error(saveError)
      setError('전체 해석은 열렸지만 저장에 실패했습니다.')
      trackEvent('reading_save_fail', { source: 'guest_draft' })
      trackException('reading_save_fail', false)
      clearGuestDraft()
      return
    }

    setReadings((prev) => [data, ...prev])
    setSelectedId(data.id)
    setIsDirty(false)
    setNotice('전체 해석이 열렸어요. 이 사주를 저장해 두었습니다.')
    clearGuestDraft()
    bumpReadingCount(1)
    trackEvent('reading_save', { source: 'guest_draft' })
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

    const { data, error: profileError } = await fetchProfile(user.id)

    if (profileError) {
      console.error(profileError)
      setError('프로필을 불러오지 못했습니다.')
      trackException('profile_load_fail', false)
      setProfileLoading(false)
      return
    }

    let nextProfile = data

    if (!nextProfile && draft?.name && draft?.birthDate && draft?.gender) {
      const { data: created, error: createError } = await upsertProfile(
        user.id,
        formToProfilePayload(draft),
      )

      if (createError) {
        console.error(createError)
        setProfile(null)
        setProfileRequired(true)
        setShowProfileModal(true)
        setProfileLoading(false)
        setReadings([])
        trackEvent('profile_save_fail', { first_setup: true, source: 'guest_draft' })
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
      setUserProperties({ user_type: 'member', has_profile: false })
      return
    }

    setProfile(nextProfile)
    setProfileRequired(false)
    setShowProfileModal(false)
    setUserProperties({ user_type: 'member', has_profile: true })
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

  async function loadReadingCount() {
    const { data, error: countError } = await fetchReadingCount()
    if (countError) {
      console.error(countError)
      return
    }
    const next = Number(data)
    if (Number.isFinite(next) && next >= 0) setReadingCount(next)
  }

  function bumpReadingCount(delta) {
    setReadingCount((prev) => {
      if (typeof prev !== 'number') return prev
      return Math.max(0, prev + delta)
    })
  }

  async function loadReadings() {
    if (!user?.id) return
    setListLoading(true)
    const { data, error: fetchError } = await fetchReadings(user.id)

    if (fetchError) {
      console.error(fetchError)
      setListError('저장된 사주 목록을 불러오지 못했습니다.')
      trackException('readings_load_fail', false)
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
    trackEvent('select_content', { content_type: 'saved_reading' })
    trackEvent('select_reading')
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
    resetCopied()
    resetLinkCopied()
    setIsDirty(false)
  }

  function startNewReading(location = 'unknown') {
    const alreadyOnNewPage = !selectedId && !result
    trackEvent('new_reading', { location, already_open: alreadyOnNewPage })
    formStartedRef.current = false

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
    resetCopied()
    resetLinkCopied()
    if (profile) {
      applyProfileToForm(profile)
    } else if (isGuest) {
      resetCopied()
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

  function openProfileEditor(location = 'unknown') {
    trackEvent('profile_edit_click', { location })
    setProfileRequired(false)
    setShowProfileModal(true)
  }

  function closeProfileModal() {
    if (profileRequired) return
    trackEvent('profile_modal_close')
    setShowProfileModal(false)
  }

  async function handleSaveProfile(payload) {
    if (!user) return
    setProfileSaving(true)
    setError('')
    setNotice('')

    const { data, error: saveError } = await upsertProfile(user.id, payload)

    setProfileSaving(false)

    if (saveError) {
      console.error(saveError)
      setError('프로필 저장에 실패했습니다.')
      trackEvent('profile_save_fail', { first_setup: !profile })
      return
    }

    const wasFirstSetup = !profile
    setProfile(data)
    setProfileRequired(false)
    setShowProfileModal(false)
    setUserProperties({ user_type: 'member', has_profile: true })
    trackEvent('profile_save', { first_setup: wasFirstSetup })
    if (wasFirstSetup) {
      trackEvent('sign_up', { method: 'google' })
    }

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
      trackEvent('form_error', {
        form_id: 'saju_form',
        missing_name: !name.trim(),
        missing_birth_date: !birthDate,
        missing_gender: !gender,
      })
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (user && !profile) {
      setProfileRequired(true)
      setShowProfileModal(true)
      setError('먼저 프로필을 등록해 주세요.')
      trackEvent('analyze_blocked', { reason: 'profile_required' })
      return
    }

    const editingId = selectedId
    setLoading(true)
    setError('')
    setNotice('')
    setResult('')
    resetCopied()
    resetLinkCopied()
    trackEvent('analyze_start', {
      user_type: user ? 'member' : 'guest',
      is_rerun: Boolean(editingId),
      calendar_type: calendarType,
      time_known: !timeUnknown && Boolean(birthTime),
    })
    const startedAt = Date.now()

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
      trackEvent('analyze_saju', {
        user_type: user ? 'member' : 'guest',
        is_rerun: Boolean(editingId),
        calendar_type: calendarType,
        time_known: !timeUnknown && Boolean(birthTime),
        gated: !user,
        duration_ms: Date.now() - startedAt,
      })

      if (!user) {
        persistGuestDraft({ result: text })
        return
      }

      const payload = readingPayload({ result: text })

      if (editingId) {
        const { data, error: updateError } = await updateReading(editingId, payload)

        if (updateError) {
          console.error(updateError)
          setError('사주 해석은 됐지만 수정 저장에 실패했습니다.')
          trackEvent('reading_save_fail', { source: 'rerun' })
          return
        }

        setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
        setSelectedId(data.id)
        setIsDirty(false)
        setNotice('저장본을 다시 풀어서 수정했습니다.')
        trackEvent('reading_save', { source: 'rerun' })
      } else {
        const { data, error: saveError } = await insertReading(payload)

        if (saveError) {
          console.error(saveError)
          setError('사주 해석은 됐지만 저장에 실패했습니다.')
          trackEvent('reading_save_fail', { source: 'new' })
          return
        }

        setReadings((prev) => [data, ...prev])
        setSelectedId(data.id)
        setIsDirty(false)
        setNotice('새 사주를 저장했습니다.')
        bumpReadingCount(1)
        trackEvent('reading_save', { source: 'new' })
      }
    } catch (err) {
      console.error(err)
      const reason = classifyAnalyzeError(err)
      trackEvent('analyze_fail', {
        user_type: user ? 'member' : 'guest',
        is_rerun: Boolean(editingId),
        reason,
        duration_ms: Date.now() - startedAt,
      })
      trackException(`analyze_fail:${reason}`, false)
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveInfo() {
    if (!user || !selectedId) return
    if (!validateForm()) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      trackEvent('form_error', {
        form_id: 'save_info',
        missing_name: !name.trim(),
        missing_birth_date: !birthDate,
        missing_gender: !gender,
      })
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const { data, error: updateError } = await updateReading(selectedId, readingPayload())

      if (updateError) {
        console.error(updateError)
        setError('정보 수정에 실패했습니다.')
        trackEvent('save_info_fail')
        return
      }

      setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
      setIsDirty(false)
      setNotice('입력 정보를 수정 저장했습니다.')
      trackEvent('save_info')
    } catch (err) {
      console.error(err)
      trackEvent('save_info_fail')
      setError(err.message || '정보 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(readingId, readingName, location = 'unknown') {
    if (!user || !readingId) return
    const ok = window.confirm(
      `"${readingName || '이 사주'}" 저장본을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`,
    )
    if (!ok) {
      trackEvent('reading_delete_cancel', { location })
      return
    }

    setDeletingId(readingId)
    setError('')
    setNotice('')

    try {
      const { error: deleteError } = await deleteReading(readingId)

      if (deleteError) {
        console.error(deleteError)
        setError('삭제에 실패했습니다.')
        trackEvent('reading_delete_fail', { location })
        return
      }

      setReadings((prev) => prev.filter((item) => item.id !== readingId))
      if (selectedId === readingId) {
        startNewReading('after_delete')
      }
      setNotice('저장본을 삭제했습니다.')
      bumpReadingCount(-1)
      trackEvent('reading_delete', { location })
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
      pulseCopied()
      trackEvent('reading_copy', { source: 'workspace' })
    } catch (err) {
      console.error(err)
      trackEvent('reading_copy_fail', { source: 'workspace' })
      setError('결과를 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  async function handleShareResult() {
    if (!selectedId) return
    try {
      const outcome = await shareReadingLink({ id: selectedId, name })
      if (outcome.cancelled) {
        trackEvent('share_cancel', { source: 'workspace' })
        return
      }
      trackEvent('share', {
        method: outcome.shared ? 'native' : 'copy_link',
        content_type: 'saju_reading',
        source: 'workspace',
      })
      if (outcome.copied) {
        pulseLinkCopied()
        showToast('공유 링크를 복사했어요.')
      }
    } catch (err) {
      console.error(err)
      trackEvent('share_fail', { source: 'workspace' })
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
  const showTrustStat = isGuest && !result && !loading && readingCount > 0

  const profileModalInitial =
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

  return {
    auth: {
      busy: authBusy,
      error: authError,
      signOut,
    },
    boot: {
      loading: booting,
      message: authLoading ? '로그인 상태 확인 중…' : '프로필 불러오는 중…',
    },
    user: {
      isGuest,
      displayName,
      avatarUrl,
      profile,
      profileReady,
      profileSummary,
      profileRequired,
      showProfileModal,
      profileSaving,
      profileModalInitial,
    },
    form: {
      name,
      birthDate,
      birthTime,
      timeUnknown,
      gender,
      calendarType,
      fieldErrors,
      formRef,
      nameInputRef,
      canSubmit,
      disabled: busy || (!isGuest && !profileReady),
      isViewingSaved,
      isDirty,
    },
    readings: {
      list: readings,
      selectedId,
      listLoading,
      listError,
      deletingId,
    },
    result: {
      text: result,
      gated: gatedResult,
      gatedParts,
      metaText,
      copied,
      linkCopied,
      resultRef,
    },
    ui: {
      toast,
      error,
      notice,
      loading,
      busy,
      saving,
      showTrustStat,
      readingCount,
    },
    actions: {
      handleGuestSignIn,
      openProfileEditor,
      closeProfileModal,
      handleSaveProfile,
      startNewReading,
      applyReading,
      handleDelete,
      handleAnalyze,
      handleSaveInfo,
      handleCopyResult,
      handleShareResult,
      handleFormStart,
      updateName,
      updateBirthDate,
      updateBirthTime,
      updateTimeUnknown,
      updateGender,
      updateCalendarType,
    },
  }
}
