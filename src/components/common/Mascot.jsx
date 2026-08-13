import mascotSrc from '../../assets/mascot.png'

export default function Mascot({ caption, size = 'md', className = '' }) {
  return (
    <figure className={`mascot ${size === 'lg' ? 'mascot-lg' : ''} ${className}`.trim()}>
      {caption ? (
        <figcaption className="mascot-bubble" aria-label={caption}>
          <span className="mascot-bubble-text">{caption}</span>
        </figcaption>
      ) : null}
      <img
        className="mascot-img"
        src={mascotSrc}
        alt="사주미 마스코트"
        width={200}
        height={200}
        decoding="async"
        draggable={false}
        onError={(e) => {
          if (e.currentTarget.src.includes('/mascot.png')) return
          e.currentTarget.src = '/mascot.png'
        }}
      />
    </figure>
  )
}
