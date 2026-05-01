import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import ModelPicker from './components/ModelPicker'
import { useRateLimit } from './hooks/useRateLimit'
import type { ChatCompletionResponse, Message, Theme, WebSource } from './types/chat'

const THAI_LLM_API_PATH = '/api/v1/chat/completions'
const THAI_LLM_MODELS_API_PATH = '/api/v1/models'
const DEFAULT_MODEL = 'typhoon-s-thaillm-8b-instruct'
const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_MAX_TOKENS = 2048

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const THAI_LLM_MODEL = import.meta.env.VITE_THAILLM_MODEL ?? DEFAULT_MODEL
const THAI_LLM_TEMPERATURE = parseEnvNumber(
  import.meta.env.VITE_THAILLM_TEMPERATURE,
  DEFAULT_TEMPERATURE,
)
const THAI_LLM_MAX_TOKENS = parseEnvNumber(
  import.meta.env.VITE_THAILLM_MAX_TOKENS,
  DEFAULT_MAX_TOKENS,
)
const THAI_LLM_TOKEN = import.meta.env.VITE_THAILLM_API_KEY
const CHAT_STORAGE_KEY = 'thai-chat-ai-history-v1'
const THEME_STORAGE_KEY = 'thai-chat-ai-theme-v1'
const MODEL_STORAGE_KEY = 'thai-chat-ai-model-v1'
const WEB_SEARCH_MODE_STORAGE_KEY = 'thai-chat-ai-web-search-mode-v1'
const WEB_SEARCH_COUNT_STORAGE_KEY = 'thai-chat-ai-web-search-count-v1'
const WEB_SEARCH_REGION_STORAGE_KEY = 'thai-chat-ai-web-search-region-v1'
const WEB_SEARCH_PROXY_PATH = '/search-api/'
const RATE_LIMIT_PER_SECOND = 5
const RATE_LIMIT_PER_MINUTE = 200
const RATE_LIMIT_NOTICE_COOLDOWN_MS = 1500
const WEB_SEARCH_TIMEOUT_MS = 6000
const WEB_SEARCH_COUNT_OPTIONS = [3, 5, 8] as const
const WEB_SEARCH_REGION_OPTIONS = [
  { label: 'TH', value: 'th-th' },
  { label: 'Global', value: 'wt-wt' },
  { label: 'US', value: 'us-en' },
] as const
const DEFAULT_WEB_SEARCH_TRUSTED_DOMAINS = [
  'wikipedia.org',
  'britannica.com',
  'reuters.com',
  'bbc.com',
  'who.int',
  'un.org',
  'worldbank.org',
  'ourworldindata.org',
  'nature.com',
  'science.org',
  'nih.gov',
  'nasa.gov',
]

type WebTopic = {
  Text?: string
  FirstURL?: string
  Topics?: WebTopic[]
}

type WebSearchResponse = {
  AbstractText?: string
  AbstractURL?: string
  Results?: WebTopic[]
  RelatedTopics?: WebTopic[]
}

type WebSearchContext = {
  context: string
  sources: WebSource[]
}

type SearchEntry = {
  title: string
  url: string
  domain: string
  trusted: boolean
}

type ModelsApiResponse = {
  data?: Array<{ id?: string }>
  models?: Array<{ id?: string } | string>
}

type WebSearchRegionValue = (typeof WEB_SEARCH_REGION_OPTIONS)[number]['value']

const starterMessages: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content:
      'สวัสดี! ผมคือผู้ช่วย AI ของคุณ ลองถามอะไรก็ได้ เช่น สรุปบทความ เขียนโค้ด หรือช่วยคิดไอเดีย',
    time: 'ตอนนี้',
  },
]

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getNextThemeMode(current: Theme): Theme {
  if (current === 'light') {
    return 'dark'
  }

  if (current === 'dark') {
    return 'system'
  }

  return 'light'
}

function flattenTopics(topics: WebTopic[]): WebTopic[] {
  return topics.flatMap((topic) => {
    if (topic.Topics && topic.Topics.length > 0) {
      return flattenTopics(topic.Topics)
    }

    return topic.Text && topic.FirstURL ? [topic] : []
  })
}

function parseDomainList(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^www\./, ''))
    .filter(Boolean)
}

const WEB_SEARCH_TRUSTED_DOMAINS = (() => {
  const customDomains = parseDomainList(import.meta.env.VITE_WEB_SEARCH_TRUSTED_DOMAINS)
  return customDomains.length > 0 ? customDomains : DEFAULT_WEB_SEARCH_TRUSTED_DOMAINS
})()

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

function isTrustedDomain(domain: string): boolean {
  return WEB_SEARCH_TRUSTED_DOMAINS.some(
    (allowedDomain) => domain === allowedDomain || domain.endsWith(`.${allowedDomain}`),
  )
}

function toSearchEntry(title: string, url: string): SearchEntry | null {
  const domain = extractDomain(url)
  if (!domain) {
    return null
  }

  return {
    title,
    url,
    domain,
    trusted: isTrustedDomain(domain),
  }
}

function getNextSearchCount(current: number): number {
  const index = WEB_SEARCH_COUNT_OPTIONS.indexOf(
    current as (typeof WEB_SEARCH_COUNT_OPTIONS)[number],
  )

  if (index === -1 || index === WEB_SEARCH_COUNT_OPTIONS.length - 1) {
    return WEB_SEARCH_COUNT_OPTIONS[0]
  }

  return WEB_SEARCH_COUNT_OPTIONS[index + 1]
}

function isWebSearchRegionValue(value: string): value is WebSearchRegionValue {
  return WEB_SEARCH_REGION_OPTIONS.some((item) => item.value === value)
}

function getNextSearchRegion(current: WebSearchRegionValue): WebSearchRegionValue {
  const index = WEB_SEARCH_REGION_OPTIONS.findIndex((item) => item.value === current)
  if (index === -1 || index === WEB_SEARCH_REGION_OPTIONS.length - 1) {
    return WEB_SEARCH_REGION_OPTIONS[0].value
  }

  return WEB_SEARCH_REGION_OPTIONS[index + 1].value
}

function normalizeModelValue(value: string): string {
  return value.trim().toLowerCase()
}

function getModelShorthand(modelId: string): string | null {
  const normalized = normalizeModelValue(modelId)
  return normalized.startsWith('openthaigpt') ? 'openthaigpt' : null
}

function parseModelOptions(payload: ModelsApiResponse | null): string[] {
  if (!payload) {
    return []
  }

  const raw = [
    ...(payload.data ?? []).map((item) => item.id),
    ...(payload.models ?? []).map((item) => (typeof item === 'string' ? item : item.id)),
  ]

  return raw
    .map((item) => (item ? normalizeModelValue(item) : ''))
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
}

function getModelLabel(model: string): string {
  const text = normalizeModelValue(model)
  return text.length <= 20 ? text : `${text.slice(0, 17)}...`
}

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedRaw = localStorage.getItem(CHAT_STORAGE_KEY)

    if (!savedRaw) {
      return starterMessages
    }

    try {
      const savedMessages = JSON.parse(savedRaw) as Message[]
      if (!Array.isArray(savedMessages) || savedMessages.length === 0) {
        return starterMessages
      }

      return savedMessages
    } catch {
      return starterMessages
    }
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY)
    if (savedModel) {
      return normalizeModelValue(savedModel)
    }

    return normalizeModelValue(THAI_LLM_MODEL)
  })
  const [modelDraft, setModelDraft] = useState<string>('')
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false)
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme
    }

    return 'system'
  })
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(() => {
    return localStorage.getItem(WEB_SEARCH_MODE_STORAGE_KEY) === '1'
  })
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
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme())
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)

  const theme = themeMode === 'system' ? systemTheme : themeMode

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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    handleSystemThemeChange()
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
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
    rateStatus === 'cooldown' ? 'rate-status-cooldown' :
      rateStatus === 'danger' ? 'rate-status-danger' :
        rateStatus === 'warning' ? 'rate-status-warning' :
          'rate-status-safe'

  function getCurrentTime(): string {
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      return 'เชื่อมต่อ API ไม่สำเร็จ อาจเกิดจากเครือข่ายหรือ CORS กรุณารีสตาร์ต dev server แล้วลองใหม่'
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'เกิดข้อผิดพลาดระหว่างเรียกใช้บริการ AI'
  }

  async function buildWebSearchContext(query: string): Promise<WebSearchContext | null> {
    if (!webSearchEnabled) {
      return null
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS)

    try {
      const searchUrl = `${WEB_SEARCH_PROXY_PATH}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=${webSearchRegion}`
      const response = await fetch(searchUrl, {
        signal: controller.signal,
      })

      if (!response.ok) {
        return null
      }

      const searchJson = (await response.json()) as WebSearchResponse
      const directResults = (searchJson.Results ?? []).filter(
        (item) => item.Text && item.FirstURL,
      )
      const relatedResults = flattenTopics(searchJson.RelatedTopics ?? [])

      const allEntries: SearchEntry[] = []

      if (searchJson.AbstractText && searchJson.AbstractURL) {
        const abstractEntry = toSearchEntry(searchJson.AbstractText, searchJson.AbstractURL)
        if (abstractEntry) {
          allEntries.push(abstractEntry)
        }
      }

      const uniqueItems = [...directResults, ...relatedResults].reduce<WebTopic[]>((acc, item) => {
        if (!item.FirstURL) {
          return acc
        }

        const exists = acc.some((saved) => saved.FirstURL === item.FirstURL)
        if (!exists) {
          acc.push(item)
        }

        return acc
      }, [])

      uniqueItems.forEach((item) => {
        if (item.Text && item.FirstURL) {
          const entry = toSearchEntry(item.Text, item.FirstURL)
          if (entry) {
            allEntries.push(entry)
          }
        }
      })

      const dedupedEntries = allEntries.reduce<SearchEntry[]>((acc, item) => {
        const exists = acc.some((saved) => saved.url === item.url)
        if (!exists) {
          acc.push(item)
        }

        return acc
      }, [])

      const trustedEntries = dedupedEntries.filter((entry) => entry.trusted)
      const fallbackEntries = dedupedEntries.filter((entry) => !entry.trusted)
      const selectedEntries = [...trustedEntries, ...fallbackEntries].slice(0, webSearchCount)

      const summaryLines = selectedEntries.map((entry) => `- ${entry.title} (${entry.url})`)
      const sources: WebSource[] = selectedEntries.map((entry) => ({
        title: entry.title,
        url: entry.url,
        domain: entry.domain,
        trusted: entry.trusted,
      }))

      if (summaryLines.length === 0) {
        return null
      }

      return {
        context: `ข้อมูลจากการค้นเว็บล่าสุด (ใช้ประกอบคำตอบ):\n${summaryLines.join('\n')}`,
        sources,
      }
    } catch {
      return null
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = input.trim()

    if (!trimmed || isTyping || cooldownRemainingMs > 0) {
      return
    }

    const rateLimit = consume()
    if (!rateLimit.allowed) {
      const cooldownSeconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000))

      if (shouldShowRateLimitNotice()) {
        const rateLimitMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `ส่งคำขอเร็วเกินไป กรุณารอ ${cooldownSeconds} วินาที แล้วลองใหม่ (ลิมิต: ${RATE_LIMIT_PER_SECOND} req/s และ ${RATE_LIMIT_PER_MINUTE} req/min)`,
          time: getCurrentTime(),
        }

        setMessages((prev) => [...prev, rateLimitMessage])
      }
      return
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      time: getCurrentTime(),
    }

    const outboundMessages = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      if (!THAI_LLM_TOKEN) {
        throw new Error('ยังไม่ได้ตั้งค่า VITE_THAILLM_API_KEY ในไฟล์ .env')
      }

      const webSearchContext = await buildWebSearchContext(trimmed)
      const messagesForApi = [...outboundMessages]

      if (webSearchContext) {
        messagesForApi.unshift({
          role: 'assistant',
          content:
            `${webSearchContext.context}\n\nโปรดสรุปเป็นภาษาไทยให้กระชับ แยกหัวข้อชัดเจน และระบุแหล่งข้อมูลที่ใช้อ้างอิง`,
        })
      }

      const response = await fetch(THAI_LLM_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${THAI_LLM_TOKEN}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messagesForApi,
          max_tokens: THAI_LLM_MAX_TOKENS,
          temperature: THAI_LLM_TEMPERATURE,
        }),
      })

      const responseJson = (await response.json().catch(() => null)) as ChatCompletionResponse | null

      if (!response.ok) {
        const apiError = responseJson?.error?.message || 'ไม่สามารถเชื่อมต่อบริการ AI ได้ในขณะนี้'
        throw new Error(apiError)
      }

      const assistantContent = responseJson?.choices?.[0]?.message?.content?.trim()
      if (!assistantContent) {
        throw new Error('บริการ AI ไม่ได้ส่งข้อความกลับมา')
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        time: getCurrentTime(),
        sources: webSearchContext?.sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `เกิดข้อผิดพลาด: ${getErrorMessage(error)}`,
        time: getCurrentTime(),
      }

      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      setIsTyping(false)
    }
  }

  function handleClearConversation() {
    setMessages(starterMessages)
    localStorage.removeItem(CHAT_STORAGE_KEY)
  }

  function handleCycleTheme() {
    setThemeMode((current) => getNextThemeMode(current))
  }

  function handleToggleWebSearch() {
    setWebSearchEnabled((current) => !current)
  }

  async function fetchModelOptions() {
    if (!THAI_LLM_TOKEN) {
      setModelsError('ยังไม่ได้ตั้งค่า VITE_THAILLM_API_KEY จึงโหลดรายการโมเดลไม่ได้')
      setModelOptions([])
      return
    }

    setIsLoadingModels(true)
    setModelsError(null)

    try {
      const response = await fetch(THAI_LLM_MODELS_API_PATH, {
        headers: {
          Authorization: `Bearer ${THAI_LLM_TOKEN}`,
        },
      })
      const payload = (await response.json().catch(() => null)) as ModelsApiResponse | null

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดรายการโมเดลได้')
      }

      const options = parseModelOptions(payload)
      if (options.length === 0) {
        throw new Error('API ไม่ได้ส่งรายการโมเดลกลับมา')
      }

      setModelOptions(options)
    } catch {
      setModelOptions([])
      setModelsError('โหลดรายการโมเดลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoadingModels(false)
    }
  }

  function handleOpenModelPicker() {
    setModelDraft(selectedModel)
    setIsModelPickerOpen(true)

    if (modelOptions.length === 0 && !isLoadingModels) {
      void fetchModelOptions()
    }
  }

  function handleCloseModelPicker() {
    setIsModelPickerOpen(false)
    setModelDraft('')
  }

  function handleApplyModel(model: string) {
    const normalizedModel = normalizeModelValue(model)
    if (!normalizedModel) {
      return
    }

    setSelectedModel(normalizedModel)
    handleCloseModelPicker()
  }

  function handleApplyModelDraft() {
    handleApplyModel(modelDraft)
  }

  function handleCycleWebSearchCount() {
    setWebSearchCount((current) => getNextSearchCount(current))
  }

  function handleCycleWebSearchRegion() {
    setWebSearchRegion((current) => getNextSearchRegion(current))
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const form = event.currentTarget.form
      form?.requestSubmit()
    }
  }

  const isSendDisabled = !input.trim() || isTyping || cooldownRemainingMs > 0
  const sendButtonLabel =
    cooldownRemainingMs > 0
      ? `รอ ${Math.max(1, Math.ceil(cooldownRemainingMs / 1000))}s`
      : 'ส่ง'

  return (
    <main className="chat-shell">
      <ChatHeader
        messageCount={messageCount}
        onClear={handleClearConversation}
        disableClear={messages.length <= starterMessages.length || isTyping}
        themeMode={themeMode}
        onCycleTheme={handleCycleTheme}
        webSearchEnabled={webSearchEnabled}
        onToggleWebSearch={handleToggleWebSearch}
        webSearchCount={webSearchCount}
        onCycleWebSearchCount={handleCycleWebSearchCount}
        webSearchRegionLabel={webSearchRegionLabel}
        onCycleWebSearchRegion={handleCycleWebSearchRegion}
        activeModelLabel={activeModelLabel}
        onOpenModelPicker={handleOpenModelPicker}
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
        isOpen={isModelPickerOpen}
        isLoading={isLoadingModels}
        errorMessage={modelsError}
        modelOptions={modelOptions}
        modelDraft={modelDraft}
        activeModel={selectedModel}
        onModelDraftChange={setModelDraft}
        onApplyModelDraft={handleApplyModelDraft}
        onApplyModel={handleApplyModel}
        onRefreshModels={fetchModelOptions}
        onClose={handleCloseModelPicker}
        getModelShorthand={getModelShorthand}
      />
    </main>
  )
}

export default App
