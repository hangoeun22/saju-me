export default function ProfileChip({ profile, profileSummary, onEdit }) {
  if (!profile) return null

  return (
    <div className="profile-chip" role="status">
      <div>
        <p className="profile-chip-label">내 프로필</p>
        <p className="profile-chip-text">
          <strong>{profile.name}</strong>
          {profileSummary ? ` · ${profileSummary}` : ''}
        </p>
      </div>
      <button type="button" className="mode-banner-btn" onClick={onEdit}>
        수정
      </button>
    </div>
  )
}
