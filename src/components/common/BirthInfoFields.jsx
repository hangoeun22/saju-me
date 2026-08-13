export default function BirthInfoFields({
  idPrefix = '',
  genderName,
  calendarName,
  nameInputRef,
  values,
  fieldErrors = {},
  onNameChange,
  onBirthDateChange,
  onBirthTimeChange,
  onTimeUnknownChange,
  onGenderChange,
  onCalendarTypeChange,
}) {
  const ids = {
    name: `${idPrefix}name`,
    birthDate: `${idPrefix}birthDate`,
    birthTime: `${idPrefix}birthTime`,
    gender: `${idPrefix}gender-label`,
    calendar: `${idPrefix}calendar-label`,
  }
  const radios = {
    gender: genderName ?? (idPrefix ? `${idPrefix}gender` : 'gender'),
    calendar: calendarName ?? (idPrefix ? `${idPrefix}calendar` : 'calendarType'),
  }

  return (
    <>
      <div className={fieldErrors.name ? 'field field-error' : 'field'}>
        <label htmlFor={ids.name}>이름</label>
        <input
          ref={nameInputRef}
          id={ids.name}
          type="text"
          placeholder="예: 홍길동"
          autoComplete="name"
          value={values.name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {fieldErrors.name && <p className="field-hint">이름을 입력해 주세요.</p>}
      </div>

      <div className={fieldErrors.birthDate ? 'field field-error' : 'field'}>
        <label htmlFor={ids.birthDate}>생년월일</label>
        <input
          id={ids.birthDate}
          type="date"
          value={values.birthDate}
          onChange={(e) => onBirthDateChange(e.target.value)}
        />
        {fieldErrors.birthDate && (
          <p className="field-hint">생년월일을 선택해 주세요.</p>
        )}
      </div>

      <div className="field">
        <label htmlFor={ids.birthTime}>태어난 시간</label>
        <input
          id={ids.birthTime}
          type="time"
          value={values.birthTime}
          disabled={values.timeUnknown}
          onChange={(e) => onBirthTimeChange(e.target.value)}
        />
        <label className="time-unknown">
          <input
            type="checkbox"
            checked={values.timeUnknown}
            onChange={(e) => onTimeUnknownChange(e.target.checked)}
          />
          시간 모름
        </label>
      </div>

      <div className={fieldErrors.gender ? 'field field-error' : 'field'}>
        <span className="label" id={ids.gender}>
          성별
        </span>
        <div className="options" role="radiogroup" aria-labelledby={ids.gender}>
          <label>
            <input
              type="radio"
              name={radios.gender}
              value="male"
              checked={values.gender === 'male'}
              onChange={(e) => onGenderChange(e.target.value)}
            />
            남성
          </label>
          <label>
            <input
              type="radio"
              name={radios.gender}
              value="female"
              checked={values.gender === 'female'}
              onChange={(e) => onGenderChange(e.target.value)}
            />
            여성
          </label>
        </div>
        {fieldErrors.gender && <p className="field-hint">성별을 선택해 주세요.</p>}
      </div>

      <div className="field">
        <span className="label" id={ids.calendar}>
          양력 / 음력
        </span>
        <div className="options" role="radiogroup" aria-labelledby={ids.calendar}>
          <label>
            <input
              type="radio"
              name={radios.calendar}
              value="solar"
              checked={values.calendarType === 'solar'}
              onChange={(e) => onCalendarTypeChange(e.target.value)}
            />
            양력
          </label>
          <label>
            <input
              type="radio"
              name={radios.calendar}
              value="lunar"
              checked={values.calendarType === 'lunar'}
              onChange={(e) => onCalendarTypeChange(e.target.value)}
            />
            음력
          </label>
        </div>
      </div>
    </>
  )
}
