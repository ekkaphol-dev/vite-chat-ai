import { useEffect, useRef, useState } from 'react'
import type { Theme } from '../types/chat'

type ChatHeaderProps = {
  messageCount: number
  onClear: () => void
  disableClear: boolean
  themeMode: Theme
  onCycleTheme: () => void
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  webSearchCount: number
  onCycleWebSearchCount: () => void
  webSearchRegionLabel: string
  onCycleWebSearchRegion: () => void
  activeModelLabel: string
  onOpenModelPicker: () => void
}

function ChatHeader({
  messageCount,
  onClear,
  disableClear,
  themeMode,
  onCycleTheme,
  webSearchEnabled,
  onToggleWebSearch,
  webSearchCount,
  onCycleWebSearchCount,
  webSearchRegionLabel,
  onCycleWebSearchRegion,
  activeModelLabel,
  onOpenModelPicker,
}: ChatHeaderProps) {
  const tooltipId = 'theme-mode-tooltip'
  const tooltipWrapRef = useRef<HTMLDivElement | null>(null)
  const [tooltipSide, setTooltipSide] = useState<'center' | 'left' | 'right'>('center')

  const themeIcon =
    themeMode === 'light' ? 'sun' :
      themeMode === 'dark' ? 'moon' :
        'system'

  const themeLabel =
    themeMode === 'light' ? 'Light' :
      themeMode === 'dark' ? 'Dark' :
        'System'

  useEffect(() => {
    function updateTooltipSide() {
      const wrap = tooltipWrapRef.current
      if (!wrap) {
        return
      }

      const rect = wrap.getBoundingClientRect()
      const edgePadding = 24
      const tooltipHalfWidth = 130

      if (rect.left < tooltipHalfWidth + edgePadding) {
        setTooltipSide('left')
        return
      }

      if (window.innerWidth - rect.right < tooltipHalfWidth + edgePadding) {
        setTooltipSide('right')
        return
      }

      setTooltipSide('center')
    }

    updateTooltipSide()
    window.addEventListener('resize', updateTooltipSide)
    return () => window.removeEventListener('resize', updateTooltipSide)
  }, [])

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <p className="chat-label">AI Playground</p>
        <h1>คุยกับ AI</h1>
        <p className="chat-subtitle">ถาม ตอบ วางแผน หรือระดมไอเดียได้ทันที</p>
        <button
          className="ghost-button model-picker-trigger"
          type="button"
          onClick={onOpenModelPicker}
          aria-label="เปิดหน้าเลือกโมเดล"
          title="เปิดหน้าเลือกโมเดลจาก API"
        >
          <svg className="model-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>{activeModelLabel}</span>
          <svg className="model-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="chat-header-actions">
        <div
          className="theme-button-wrap"
          ref={tooltipWrapRef}
          data-tooltip-side={tooltipSide}
        >
          <button
            className="ghost-button theme-button"
            type="button"
            onClick={onCycleTheme}
            aria-label="เปลี่ยนธีม"
            aria-describedby={tooltipId}
          >
            <span
              key={themeIcon}
              className="theme-icon theme-icon-enter"
              aria-hidden="true"
              data-theme-icon={themeIcon}
            >
              {themeIcon === 'sun' && (
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
                </svg>
              )}
              {themeIcon === 'moon' && (
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path d="M20.8 14.3A8.5 8.5 0 1 1 9.7 3.2a7 7 0 1 0 11.1 11.1z"></path>
                </svg>
              )}
              {themeIcon === 'system' && (
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <rect x="3" y="4" width="18" height="12" rx="2"></rect>
                  <path d="M9 20h6M12 16v4"></path>
                </svg>
              )}
            </span>
            <span className="theme-label">{themeLabel}</span>
          </button>
          <div className="theme-tooltip" role="tooltip" id={tooltipId}>
            คลิกเพื่อสลับโหมดสี: Light → Dark → System
          </div>
        </div>

        <div className="header-divider" aria-hidden="true" />

        <div className="web-search-group">
          <button
            className={`ghost-button web-search-toggle ${webSearchEnabled ? 'web-search-active' : ''}`}
            type="button"
            onClick={onToggleWebSearch}
            aria-label="สลับโหมดค้นเว็บ"
            title="เปิด/ปิดการค้นเว็บก่อนสรุป"
          >
            <svg className="web-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5l4 4" />
            </svg>
            Web {webSearchEnabled ? 'On' : 'Off'}
          </button>
          {webSearchEnabled && (
            <>
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={onCycleWebSearchCount}
                aria-label="ปรับจำนวนผลค้นเว็บ"
                title="สลับจำนวนแหล่งค้นเว็บ: 3 → 5 → 8"
              >
                {webSearchCount}
              </button>
              <button
                className="ghost-button ghost-button--compact"
                type="button"
                onClick={onCycleWebSearchRegion}
                aria-label="ปรับภูมิภาคผลค้นเว็บ"
                title="สลับภูมิภาคผลค้นเว็บ: TH → Global → US"
              >
                {webSearchRegionLabel}
              </button>
            </>
          )}
        </div>

        <div className="header-divider" aria-hidden="true" />

        <div className="chat-counter" aria-live="polite">
          {messageCount}
          <span className="chat-counter-label">msg</span>
        </div>
        <button
          className="ghost-button ghost-button--danger"
          type="button"
          onClick={onClear}
          disabled={disableClear}
        >
          ล้าง
        </button>
      </div>
    </header>
  )
}

export default ChatHeader
