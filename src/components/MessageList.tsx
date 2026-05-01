import type { RefObject } from 'react'
import type { Message } from '../types/chat'

type MessageListProps = {
  messages: Message[]
  isTyping: boolean
  endOfMessagesRef: RefObject<HTMLDivElement | null>
}

function MessageList({
  messages,
  isTyping,
  endOfMessagesRef,
}: MessageListProps) {
  return (
    <section className="chat-panel" aria-label="บทสนทนา">
      {messages.map((message) => (
        <article
          key={message.id}
          className={`bubble ${message.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}
        >
          <p>{message.content}</p>
          {message.sources && message.sources.length > 0 && (
            <div className="bubble-sources-wrap">
              <p className="bubble-sources-count">Sources {message.sources.length}</p>
              <ul className="bubble-sources">
                {message.sources.map((source, index) => (
                  <li
                    key={`${source.url}-${index}`}
                    className={source.trusted ? 'source-item-trusted' : 'source-item-unverified'}
                  >
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {index + 1}. {source.title}
                    </a>
                    <span className="source-domain">{source.domain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <time>{message.time}</time>
        </article>
      ))}

      {isTyping && (
        <article className="bubble bubble-assistant typing-bubble" aria-live="polite">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </article>
      )}

      <div ref={endOfMessagesRef} />
    </section>
  )
}

export default MessageList
