import { useEffect, useState } from 'react'
import BirthInfoFields from '../common/BirthInfoFields'

const emptyErrors = {
  name: false,
  birthDate: false,
  gender: false,
}

export default function ProfileModal({
  open,
  required = false,
  initialProfile = null,
  saving = false,
  onSave,
  onClose,
}) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')
  const [fieldErrors, setFieldErrors] = useState(emptyErrors)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initialProfile?.name ?? '')
    setBirthDate(initialProfile?.birth_date ?? '')
    const hasTime = Boolean(initialProfile?.birth_time)
    setTimeUnknown(initialProfile ? !hasTime : false)
    setBirthTime(hasTime ? String(initialProfile.birth_time).slice(0, 5) : '')
    setGender(initialProfile?.gender ?? '')
    setCalendarType(initialProfile?.calendar_type ?? 'solar')
    setFieldErrors(emptyErrors)
    setLocalError('')
  }, [open, initialProfile])

  if (!open) return null

  function validate() {
    const next = {
      name: !name.trim(),
      birthDate: !birthDate,
      gender: !gender,
    }
    setFieldErrors(next)
    return !next.name && !next.birthDate && !next.gender
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) {
      setLocalError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }
    setLocalError('')
    await onSave({
      name: name.trim(),
      birth_date: birthDate,
      birth_time: timeUnknown || !birthTime ? null : birthTime,
      gender,
      calendar_type: calendarType,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-eyebrow">{required ? 'WELCOME' : 'PROFILE'}</p>
        <h2 id="profile-modal-title">
          {required ? '내 정보 등록' : '프로필 수정'}
        </h2>
        <p className="modal-lede">
          {required
            ? '처음 오셨네요. 사주 풀이에 필요한 기본 정보를 입력해 주세요.'
            : '저장된 프로필을 수정하면 다음 사주 입력에 바로 반영됩니다.'}
        </p>

        <form className="modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <fieldset disabled={saving}>
            <BirthInfoFields
              idPrefix="profile-"
              values={{ name, birthDate, birthTime, timeUnknown, gender, calendarType }}
              fieldErrors={fieldErrors}
              onNameChange={(value) => {
                setName(value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }))
              }}
              onBirthDateChange={(value) => {
                setBirthDate(value)
                if (fieldErrors.birthDate) {
                  setFieldErrors((prev) => ({ ...prev, birthDate: false }))
                }
              }}
              onBirthTimeChange={(value) => {
                setTimeUnknown(false)
                setBirthTime(value)
              }}
              onTimeUnknownChange={(checked) => {
                setTimeUnknown(checked)
                if (checked) setBirthTime('')
              }}
              onGenderChange={(value) => {
                setGender(value)
                if (fieldErrors.gender) {
                  setFieldErrors((prev) => ({ ...prev, gender: false }))
                }
              }}
              onCalendarTypeChange={setCalendarType}
            />

            {localError && <p className="error">{localError}</p>}

            <div className="modal-actions">
              {!required && (
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  닫기
                </button>
              )}
              <button type="submit" className="modal-btn modal-btn-primary" disabled={saving}>
                {saving ? '저장 중…' : required ? '시작하기' : '프로필 저장'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  )
}
