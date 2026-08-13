import { useEffect, useState } from 'react'

const emptyErrors = {
  name: false,
  birthDate: false,
  gender: false,
}

/**
 * 첫 로그인 필수 입력 / 프로필 수정 공용 모달
 */
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
            <div className={fieldErrors.name ? 'field field-error' : 'field'}>
              <label htmlFor="profile-name">이름</label>
              <input
                id="profile-name"
                type="text"
                placeholder="예: 홍길동"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }))
                }}
              />
              {fieldErrors.name && <p className="field-hint">이름을 입력해 주세요.</p>}
            </div>

            <div className={fieldErrors.birthDate ? 'field field-error' : 'field'}>
              <label htmlFor="profile-birthDate">생년월일</label>
              <input
                id="profile-birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value)
                  if (fieldErrors.birthDate) {
                    setFieldErrors((prev) => ({ ...prev, birthDate: false }))
                  }
                }}
              />
              {fieldErrors.birthDate && (
                <p className="field-hint">생년월일을 선택해 주세요.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="profile-birthTime">태어난 시간</label>
              <input
                id="profile-birthTime"
                type="time"
                value={birthTime}
                disabled={timeUnknown}
                onChange={(e) => {
                  setTimeUnknown(false)
                  setBirthTime(e.target.value)
                }}
              />
              <label className="time-unknown">
                <input
                  type="checkbox"
                  checked={timeUnknown}
                  onChange={(e) => {
                    setTimeUnknown(e.target.checked)
                    if (e.target.checked) setBirthTime('')
                  }}
                />
                시간 모름
              </label>
            </div>

            <div className={fieldErrors.gender ? 'field field-error' : 'field'}>
              <span className="label">성별</span>
              <div className="options">
                <label>
                  <input
                    type="radio"
                    name="profile-gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => {
                      setGender(e.target.value)
                      if (fieldErrors.gender) {
                        setFieldErrors((prev) => ({ ...prev, gender: false }))
                      }
                    }}
                  />
                  남성
                </label>
                <label>
                  <input
                    type="radio"
                    name="profile-gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => {
                      setGender(e.target.value)
                      if (fieldErrors.gender) {
                        setFieldErrors((prev) => ({ ...prev, gender: false }))
                      }
                    }}
                  />
                  여성
                </label>
              </div>
              {fieldErrors.gender && <p className="field-hint">성별을 선택해 주세요.</p>}
            </div>

            <div className="field">
              <span className="label">양력 / 음력</span>
              <div className="options">
                <label>
                  <input
                    type="radio"
                    name="profile-calendar"
                    value="solar"
                    checked={calendarType === 'solar'}
                    onChange={(e) => setCalendarType(e.target.value)}
                  />
                  양력
                </label>
                <label>
                  <input
                    type="radio"
                    name="profile-calendar"
                    value="lunar"
                    checked={calendarType === 'lunar'}
                    onChange={(e) => setCalendarType(e.target.value)}
                  />
                  음력
                </label>
              </div>
            </div>

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
