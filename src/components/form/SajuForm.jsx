import BirthInfoFields from '../common/BirthInfoFields'

export default function SajuForm({
  formRef,
  nameInputRef,
  values,
  fieldErrors,
  disabled,
  canSubmit,
  loading,
  isViewingSaved,
  onSubmit,
  onNameChange,
  onBirthDateChange,
  onBirthTimeChange,
  onTimeUnknownChange,
  onGenderChange,
  onCalendarTypeChange,
}) {
  return (
    <form
      ref={formRef}
      className={isViewingSaved ? 'form-block form-block-viewing' : 'form-block'}
      onSubmit={onSubmit}
    >
      <fieldset disabled={disabled}>
        <BirthInfoFields
          nameInputRef={nameInputRef}
          values={values}
          fieldErrors={fieldErrors}
          onNameChange={onNameChange}
          onBirthDateChange={onBirthDateChange}
          onBirthTimeChange={onBirthTimeChange}
          onTimeUnknownChange={onTimeUnknownChange}
          onGenderChange={onGenderChange}
          onCalendarTypeChange={onCalendarTypeChange}
        />

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
  )
}
