import { formatBirthDate } from '../../lib/readingShare'

export default function Sidebar({
  displayName,
  avatarUrl,
  profileSummary,
  profileReady,
  profileRequired,
  authBusy,
  readings,
  selectedId,
  listLoading,
  listError,
  busy,
  deletingId,
  onOpenProfile,
  onSignOut,
  onNewReading,
  onSelectReading,
  onDeleteReading,
}) {
  return (
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
          onClick={onOpenProfile}
        >
          프로필 수정
        </button>
        <button
          type="button"
          className="sidebar-logout"
          disabled={authBusy}
          onClick={() => void onSignOut()}
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
        onClick={onNewReading}
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
              onClick={() => onSelectReading(reading)}
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
                void onDeleteReading(reading.id, reading.name)
              }}
            >
              {deletingId === reading.id ? '…' : '삭제'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
