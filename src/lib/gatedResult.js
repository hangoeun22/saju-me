import { GUEST_PREVIEW_RATIO } from './constants'

export function splitGatedResult(text, ratio = GUEST_PREVIEW_RATIO) {
  const full = String(text ?? '')
  if (!full) return { preview: '', teaser: '' }

  const target = Math.max(220, Math.floor(full.length * ratio))
  if (full.length <= target) {
    const cut = Math.max(80, Math.floor(full.length * ratio))
    return {
      preview: full.slice(0, cut).trimEnd(),
      teaser: full.slice(cut).trimStart(),
    }
  }

  const windowStart = Math.floor(target * 0.62)
  const para = full.lastIndexOf('\n\n', target)
  const heading = full.lastIndexOf('\n#', target)
  let cut = target
  if (para >= windowStart) cut = para
  else if (heading >= windowStart) cut = heading
  else {
    const line = full.lastIndexOf('\n', target)
    if (line >= windowStart) cut = line
  }

  const preview = full.slice(0, cut).trimEnd()
  const rest = full.slice(cut).trimStart()
  const teaserLen = Math.min(rest.length, Math.max(140, Math.floor(full.length * 0.16)))
  let teaserCut = teaserLen
  const teaserPara = rest.indexOf('\n\n', Math.floor(teaserLen * 0.4))
  if (teaserPara > 0 && teaserPara < teaserLen + 90) teaserCut = teaserPara

  return { preview, teaser: rest.slice(0, teaserCut).trimEnd() }
}
