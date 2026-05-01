export type ModelPickerProps = {
  isOpen: boolean
  isLoading: boolean
  errorMessage: string | null
  modelOptions: string[]
  modelDraft: string
  activeModel: string
  onModelDraftChange: (value: string) => void
  onApplyModelDraft: () => void
  onApplyModel: (model: string) => void
  onRefreshModels: () => void
  onClose: () => void
  getModelShorthand: (modelId: string) => string | null
}

export default function ModelPicker({
  isOpen,
  isLoading,
  errorMessage,
  modelOptions,
  modelDraft,
  activeModel,
  onModelDraftChange,
  onApplyModelDraft,
  onApplyModel,
  onRefreshModels,
  onClose,
  getModelShorthand,
}: ModelPickerProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="model-picker-backdrop" role="presentation" onClick={onClose}>
      <article
        className="model-picker"
        role="dialog"
        aria-modal="true"
        aria-label="เลือกโมเดล"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="model-picker-head">
          <div>
            <p className="chat-label">Model Selector</p>
            <h2>เลือกโมเดลที่ต้องการใช้</h2>
          </div>
          <button className="model-picker-close" type="button" aria-label="ปิด" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="model-picker-note">
          รองรับทั้ง shorthand เช่น <strong>openthaigpt</strong> และ full lowercase เช่น{' '}
          <strong>openthaigpt-thaillm-8b-instruct-v7.2</strong>
        </p>

        <div className="model-draft-section">
          <span className="model-section-label">ระบุเอง</span>
          <div className="model-draft-row">
            <label className="sr-only" htmlFor="model-input">
              ระบุโมเดล
            </label>
            <input
              id="model-input"
              type="text"
              value={modelDraft}
              placeholder="พิมพ์ชื่อโมเดล..."
              onChange={(event) => onModelDraftChange(event.target.value)}
            />
            <button className="ghost-button" type="button" onClick={onApplyModelDraft}>
              ใช้โมเดลนี้
            </button>
            <button className="ghost-button" type="button" onClick={onRefreshModels}>
              โหลดรายการ
            </button>
          </div>
        </div>

        {errorMessage && <p className="model-picker-error">{errorMessage}</p>}

        {isLoading && <p className="model-picker-loading">กำลังโหลดรายการโมเดล...</p>}

        {modelOptions.length > 0 && (
          <div className="model-dropdown-row">
            <label className="model-dropdown-label" htmlFor="model-select">
              เลือกจากรายการ
            </label>
            <select
              id="model-select"
              className="model-dropdown-select"
              value={activeModel}
              onChange={(event) => onApplyModel(event.target.value)}
            >
              {modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}

        {modelOptions.length > 0 && (
          <div className="model-list-section">
            <span className="model-section-label">รายการโมเดลทั้งหมด</span>
            <ul className="model-list" aria-live="polite">
              {modelOptions.map((model) => {
                const shorthand = getModelShorthand(model)
                const isActive = activeModel === model

                return (
                  <li key={model} className={`model-item${isActive ? ' model-item--active' : ''}`}>
                    <p className="model-id">{model}</p>
                    <div className="model-item-actions">
                      {isActive && <span className="model-active-pill">ใช้งานอยู่</span>}
                      <button className="ghost-button" type="button" onClick={() => onApplyModel(model)}>
                        ใช้ full
                      </button>
                      {shorthand && (
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => onApplyModel(shorthand)}
                        >
                          ใช้ shorthand
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!isLoading && modelOptions.length === 0 && !errorMessage && (
          <ul className="model-list" aria-live="polite" />
        )}
      </article>
    </section>
  )
}
