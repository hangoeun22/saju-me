import Mascot from '../common/Mascot'

export default function HomeHeader({
  isGuest,
  isViewingSaved,
  profileReady,
  showTrustStat,
  readingCount,
  result,
  loading,
}) {
  return (
    <>
      <p className="brand">saju-me</p>
      {isGuest && !result && !loading && (
        <Mascot caption="사주 같이 볼까?" className="mascot-welcome" />
      )}
      <h1>{isViewingSaved ? '저장된 사주' : '내 사주 보기'}</h1>
      <p className={showTrustStat ? 'lede lede-with-stat' : 'lede'}>
        {isViewingSaved
          ? '과거 결과 스냅샷을 보고 있어요. 프로필과 별도로 저장된 기록입니다.'
          : isGuest
            ? '로그인 없이 바로 볼 수 있어요. 이름과 생년월일을 입력해 주세요.'
            : profileReady
              ? '프로필 정보가 자동으로 채워져 있어요. 바로 사주를 볼 수 있습니다.'
              : '먼저 프로필을 등록해 주세요.'}
      </p>
      {showTrustStat && (
        <p className="trust-stat">
          총 <em>{readingCount.toLocaleString('ko-KR')}</em>개의 사주가 생성되었습니다
        </p>
      )}
    </>
  )
}
