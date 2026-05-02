import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import ModelPicker from './components/ModelPicker'
import {
    CHAT_STORAGE_KEY,
    MODEL_STORAGE_KEY,
    RATE_LIMIT_NOTICE_COOLDOWN_MS,
    RATE_LIMIT_PER_MINUTE,
    RATE_LIMIT_PER_SECOND,
    THAI_LLM_API_PATH,
    THAI_LLM_MAX_TOKENS,
    THAI_LLM_MODEL,
    THAI_LLM_TEMPERATURE,
    THAI_LLM_TOKEN,
    THEME_STORAGE_KEY,
    WEB_SEARCH_COUNT_OPTIONS,
    WEB_SEARCH_COUNT_STORAGE_KEY,
    WEB_SEARCH_MODE_STORAGE_KEY,
    WEB_SEARCH_REGION_OPTIONS,
    WEB_SEARCH_REGION_STORAGE_KEY,
} from './config'
import { useModelPicker } from './hooks/useModelPicker'
import { useRateLimit } from './hooks/useRateLimit'
import {
    getNextSearchCount,
    getNextSearchRegion,
    isWebSearchRegionValue,
    useWebSearch,
    type WebSearchRegionValue,
} from './hooks/useWebSearch'
import { formatCurrentDateFull, getCurrentTime, getErrorMessage } from './lib/format'
import { getModelLabel, getModelShorthand, normalizeModelValue } from './lib/model'
import { getNextThemeMode, getSystemTheme } from './lib/theme'
import type { ChatCompletionResponse, Message, Theme } from './types/chat'

const starterMessages: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content:
      'สวัสดี! ผมคือผู้ช่วย AI ของคุณ ลองถามอะไรก็ได้ เช่น สรุปบทความ เขียนโค้ด หรือช่วยคิดไอเดีย',
    time: 'ตอนนี้',
  },
]

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return starterMessages
    const parsed = JSON.parse(raw) as Message[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : starterMessages
  } catch {
    return starterMessages
  }
}

function App() {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    normalizeModelValue(localStorage.getItem(MODEL_STORAGE_KEY) ?? THAI_LLM_MODEL),
  )
  const [themeMode, setThemeMode] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })
  const [webSearchEnabled, setWebSearchEnabled] = useState(
    () => localStorage.getItem(WEB_SEARCH_MODE_STORAGE_KEY) === '1',
  )
  const [webSearchCount, setWebSearchCount] = useState<number>(() => {
    const saved = Number(localStorage.getItem(WEB_SEARCH_COUNT_STORAGE_KEY))
    return WEB_SEARCH_COUNT_OPTIONS.includes(saved as (typeof WEB_SEARCH_COUNT_OPTIONS)[number])
      ? saved
      : WEB_SEARCH_COUNT_OPTIONS[1]
  })
  const [webSearchRegion, setWebSearchRegion] = useState<WebSearchRegionValue>(() => {
    const saved = localStorage.getItem(WEB_SEARCH_REGION_STORAGE_KEY)
    return saved && isWebSearchRegionValue(saved) ? saved : WEB_SEARCH_REGION_OPTIONS[0].value
  })
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)

  const theme = themeMode === 'system' ? systemTheme : themeMode

  const modelPicker = useModelPicker()
  const { buildContext: buildWebSearchContext } = useWebSearch({
    enabled: webSearchEnabled,
    count: webSearchCount,
    region: webSearchRegion,
  })

  const {
    cooldownRemainingMs,
    remainingInSecond,
    remainingInMinute,
    usageBuckets,
    status: rateStatus,
    consume,
    shouldShowRateLimitNotice,
  } = useRateLimit({
    perSecond: RATE_LIMIT_PER_SECOND,
    perMinute: RATE_LIMIT_PER_MINUTE,
    noticeCooldownMs: RATE_LIMIT_NOTICE_COOLDOWN_MS,
  })

  const messageCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages],
  )

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE_KEY, selectedModel)
  }, [selectedModel])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themeMode = themeMode
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [theme, themeMode])

  useEffect(() => {
    localStorage.setItem(WEB_SEARCH_MODE_STORAGE_KEY, webSearchEnabled ? '1' : '0')
  }, [webSearchEnabled])

  useEffect(() => {
    localStorage.setItem(WEB_SEARCH_COUNT_STORAGE_KEY, String(webSearchCount))
  }, [webSearchCount])

  useEffect(() => {
    localStorage.setItem(WEB_SEARCH_REGION_STORAGE_KEY, webSearchRegion)
  }, [webSearchRegion])

  const webSearchRegionLabel =
    WEB_SEARCH_REGION_OPTIONS.find((item) => item.value === webSearchRegion)?.label ?? 'TH'
  const activeModelLabel = getModelLabel(selectedModel)

  const rateStatusText =
    cooldownRemainingMs > 0
      ? `ติดลิมิตชั่วคราว รอ ${Math.max(1, Math.ceil(cooldownRemainingMs / 1000))} วินาที แล้วส่งใหม่ได้`
      : `คงเหลือ ${remainingInSecond}/${RATE_LIMIT_PER_SECOND} req ใน 1 วินาที และ ${remainingInMinute}/${RATE_LIMIT_PER_MINUTE} req ใน 1 นาที`

  const bucketCapacity = RATE_LIMIT_PER_MINUTE / usageBuckets.length
  const usageLevels = usageBuckets.map((value) => {
    const ratio = Math.min(1, value / bucketCapacity)
    return Math.max(1, Math.ceil(ratio * 8))
  })

  const rateStatusClassName =
    rateStatus === 'cooldown' ? 'rate-status-cooldown'
    : rateStatus === 'danger' ? 'rate-status-danger'
    : rateStatus === 'warning' ? 'rate-status-warning'
    : 'rate-status-safe'

  const isSendDisabled = !input.trim() || isTyping || cooldownRemainingMs > 0
  const sendButtonLabel =
    cooldownRemainingMs > 0
      ? `รอ ${Math.max(1, Math.ceil(cooldownRemainingMs / 1000))}s`
      : 'ส่ง'

  function makeMessage(role: Message['role'], content: string): Message {
    return { id: crypto.randomUUID(), role, content, time: getCurrentTime() }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isTyping || cooldownRemainingMs > 0) return

    const rateLimit = consume()
    if (!rateLimit.allowed) {
      if (shouldShowRateLimitNotice()) {
        const sec = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000))
        setMessages((prev) => [
          ...prev,
          makeMessage(
            'assistant',
            `ส่งคำขอเร็วเกินไป กรุณารอ ${sec} วินาที แล้วลองใหม่ (ลิมิต: ${RATE_LIMIT_PER_SECOND} req/s และ ${RATE_LIMIT_PER_MINUTE} req/min)`,
          ),
        ])
      }
      return
    }

    const isFiwfan = /fiwfan/i.test(trimmed)

    const userMessage = makeMessage('user', trimmed)
    const outbound = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      if (!THAI_LLM_TOKEN) {
        throw new Error('ยังไม่ได้ตั้งค่า VITE_THAILLM_API_KEY ในไฟล์ .env')
      }

      const webSearchContext = await buildWebSearchContext(trimmed)
      const apiMessages: { role: string; content: string }[] = [...outbound]

      if (webSearchContext) {
        apiMessages.unshift({
          role: 'assistant',
          content: `${webSearchContext.context}\n\nโปรดสรุปเป็นภาษาไทยให้กระชับ แยกหัวข้อชัดเจน และระบุแหล่งข้อมูลที่ใช้อ้างอิง`,
        })
      }

      const fiwfanContext = isFiwfan
        ? '\nหากคำถามเกี่ยวกับ fiwfan ให้กรองและแสดงผลเฉพาะโซนลาดกระบังเท่านั้น และแนะนำให้ผู้ใช้เข้าไปดูที่ https://fiwfan.app/ ด้วย'
        : ''

      apiMessages.unshift({
        role: 'system',
        content: `วันที่ปัจจุบัน: ${formatCurrentDateFull()}\nโปรดตอบคำถามโดยคำนึงถึงวันที่ปัจจุบันเสมอ หากถามเกี่ยวกับข้อมูลที่อาจเปลี่ยนแปลงได้ ให้ระบุว่าข้อมูลอาจไม่เป็นปัจจุบัน${fiwfanContext}`,
      })

      const response = await fetch(THAI_LLM_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${THAI_LLM_TOKEN}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          max_tokens: THAI_LLM_MAX_TOKENS,
          temperature: THAI_LLM_TEMPERATURE,
        }),
      })

      const json = (await response.json().catch(() => null)) as ChatCompletionResponse | null

      if (!response.ok) {
        throw new Error(json?.error?.message ?? 'ไม่สามารถเชื่อมต่อบริการ AI ได้ในขณะนี้')
      }

      const content = json?.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('บริการ AI ไม่ได้ส่งข้อความกลับมา')

      setMessages((prev) => [
        ...prev,
        { ...makeMessage('assistant', content), sources: webSearchContext?.sources },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        makeMessage('assistant', `เกิดข้อผิดพลาด: ${getErrorMessage(error)}`),
      ])
    } finally {
      setIsTyping(false)
    }
  }

  function handleApplyModel(model: string) {
    const normalized = normalizeModelValue(model)
    if (!normalized) return
    setSelectedModel(normalized)
    modelPicker.close()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <main className="chat-shell">
      <ChatHeader
        messageCount={messageCount}
        onClear={() => {
          setMessages(starterMessages)
          localStorage.removeItem(CHAT_STORAGE_KEY)
        }}
        disableClear={messages.length <= starterMessages.length || isTyping}
        themeMode={themeMode}
        onCycleTheme={() => setThemeMode(getNextThemeMode)}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={() => setWebSearchEnabled((v) => !v)}
        webSearchCount={webSearchCount}
        onCycleWebSearchCount={() => setWebSearchCount(getNextSearchCount)}
        webSearchRegionLabel={webSearchRegionLabel}
        onCycleWebSearchRegion={() => setWebSearchRegion(getNextSearchRegion)}
        activeModelLabel={activeModelLabel}
        onOpenModelPicker={() => modelPicker.open(selectedModel)}
      />

      <MessageList
        messages={messages}
        isTyping={isTyping}
        endOfMessagesRef={endOfMessagesRef}
      />

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onInputKeyDown={handleInputKeyDown}
        onSubmit={handleSend}
        isSendDisabled={isSendDisabled}
        sendButtonLabel={sendButtonLabel}
        rateStatusText={rateStatusText}
        rateStatusClassName={rateStatusClassName}
        usageLevels={usageLevels}
      />

      <ModelPicker
        isOpen={modelPicker.isOpen}
        isLoading={modelPicker.isLoading}
        errorMessage={modelPicker.error}
        modelOptions={modelPicker.options}
        modelDraft={modelPicker.modelDraft}
        activeModel={selectedModel}
        onModelDraftChange={modelPicker.setModelDraft}
        onApplyModelDraft={() => handleApplyModel(modelPicker.modelDraft)}
        onApplyModel={handleApplyModel}
        onRefreshModels={modelPicker.fetchOptions}
        onClose={modelPicker.close}
        getModelShorthand={getModelShorthand}
      />
    </main>
  )
}

export default App
