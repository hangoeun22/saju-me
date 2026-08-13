export default function StatusMessages({ error, notice }) {
  return (
    <>
      {error && <p className="error">{error}</p>}
      {notice && !error && <p className="notice">{notice}</p>}
    </>
  )
}
