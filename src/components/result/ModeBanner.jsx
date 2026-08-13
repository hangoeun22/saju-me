export default function ModeBanner({
  name,
  isDirty,
  busy,
  saving,
  onSaveInfo,
  onDelete,
  onNewReading,
}) {
  return (
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
          onClick={onSaveInfo}
        >
          {saving ? '저장 중…' : '정보 저장'}
        </button>
        <button
          type="button"
          className="mode-banner-btn mode-banner-btn-danger"
          disabled={busy}
          onClick={onDelete}
        >
          삭제
        </button>
        <button type="button" className="mode-banner-btn" onClick={onNewReading}>
          내 사주로
        </button>
      </div>
    </div>
  )
}
