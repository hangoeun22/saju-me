import ReactMarkdown from 'react-markdown'
import { formatResultMarkdown } from '../../lib/readingShare'

export default function ResultMarkdown({ text, className = 'result-text', hidden = false }) {
  return (
    <div className={className} aria-hidden={hidden || undefined}>
      <ReactMarkdown
        components={{
          strong: ({ children }) => <span className="result-mark">{children}</span>,
        }}
      >
        {formatResultMarkdown(text)}
      </ReactMarkdown>
    </div>
  )
}
