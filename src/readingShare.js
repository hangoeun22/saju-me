export function formatResultMarkdown(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\n(?!\n)/g, '$1  \n')
}

export function formatBirthDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  if (!y || !m || !d) return value
  return `${y}.${m}.${d}`
}

export function genderLabel(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return ''
}

export function calendarLabel(value) {
  if (value === 'lunar') return '음력'
  if (value === 'solar') return '양력'
  return ''
}

export function readingMetaText({ birthDate, birthTime, gender, calendarType }) {
  const hasTime = Boolean(birthTime)
  return [
    formatBirthDate(birthDate),
    hasTime ? String(birthTime).slice(0, 5) : '시간 모름',
    genderLabel(gender),
    calendarLabel(calendarType),
  ]
    .filter(Boolean)
    .join(' · ')
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getShareUrl(id) {
  return `${window.location.origin}/result/${id}`
}

export async function shareReadingLink({ id, name, url } = {}) {
  const shareUrl = url || getShareUrl(id)
  const title = name ? `${name}님의 사주 해석 | saju-me` : '사주 해석 | saju-me'
  const text = name ? `${name}님의 사주 결과를 확인해 보세요.` : '사주 결과를 확인해 보세요.'

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url: shareUrl })
      return { shared: true, copied: false }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { shared: false, copied: false, cancelled: true }
      }
    }
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error('이 브라우저에서는 공유를 지원하지 않아요.')
  }

  await navigator.clipboard.writeText(shareUrl)
  return { shared: false, copied: true }
}
