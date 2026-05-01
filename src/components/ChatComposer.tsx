import type { FormEvent, KeyboardEvent } from 'react'

type ChatComposerProps = {
  input: string
  onInputChange: (value: string) => void
  onInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  isSendDisabled: boolean
  sendButtonLabel: string
  rateStatusText: string
  rateStatusClassName: string
  usageLevels: number[]
}

function ChatComposer({
  input,
  onInputChange,
  onInputKeyDown,
  onSubmit,
  isSendDisabled,
  sendButtonLabel,
  rateStatusText,
  rateStatusClassName,
  usageLevels,
}: ChatComposerProps) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="chat-input">
        พิมพ์ข้อความ
      </label>
      <textarea
        id="chat-input"
        placeholder="พิมพ์ข้อความของคุณ... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={onInputKeyDown}
        rows={1}
      />
      <button type="submit" disabled={isSendDisabled}>
        {sendButtonLabel}
      </button>
      <div className="rate-row">
        <p className={`rate-status ${rateStatusClassName}`} aria-live="polite">
          {rateStatusText}
        </p>
        <button
          className="rate-help"
          type="button"
          aria-label="คำอธิบายสีสถานะลิมิต"
          title="เขียว: ปลอดภัย | เหลือง: ใกล้ลิมิต | แดง: ใกล้วิกฤตหรือถูกล็อก"
        >
          ?
        </button>
      </div>
      <div
        className="quota-sparkline"
        role="img"
        aria-label="กราฟการใช้คำขอย้อนหลัง 60 วินาทีล่าสุด"
      >
        {usageLevels.map((level, index) => (
          <span
            key={index}
            className={`quota-bar ${rateStatusClassName} quota-h-${level}`}
          />
        ))}
      </div>
    </form>
  )
}

export default ChatComposer
