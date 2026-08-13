import Mascot from '../common/Mascot'

export default function AuthScreen({
  caption = '분석 중!',
  title,
  lede,
  brandAsLink = false,
  children,
}) {
  return (
    <div className="auth-screen">
      {brandAsLink ? (
        <a className="brand brand-link" href="/">
          saju-me
        </a>
      ) : (
        <p className="brand">saju-me</p>
      )}
      <Mascot caption={caption} className="mascot-auth" />
      {title ? <h1>{title}</h1> : null}
      {lede ? <p className="auth-lede">{lede}</p> : null}
      {children}
    </div>
  )
}
