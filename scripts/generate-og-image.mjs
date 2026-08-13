import sharp from 'sharp'

const width = 1200
const height = 630

const mascot = await sharp('public/mascot.png')
  .resize(280, 280, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

const svg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5ddde"/>
      <stop offset="52%" stop-color="#e4ecd6"/>
      <stop offset="100%" stop-color="#d7e0cb"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="620" y="250" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#1a2318" letter-spacing="8">saju-me</text>
  <text x="620" y="330" font-family="Arial, sans-serif" font-size="34" fill="#2f3a2c">나만의 사주 기록과 해석</text>
  <text x="620" y="390" font-family="Arial, sans-serif" font-size="26" fill="#6d7668">Google 로그인으로 저장하고 다시 보기</text>
</svg>
`)

await sharp(svg)
  .composite([{ input: mascot, left: 160, top: 175 }])
  .png()
  .toFile('public/og-image.png')

console.log('og-image created')
