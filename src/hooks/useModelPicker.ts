import { useState } from "react";
import { THAI_LLM_MODELS_API_PATH, THAI_LLM_TOKEN } from "../config";
import type { ModelsApiResponse } from "../lib/model";
import { parseModelOptions } from "../lib/model";

export function useModelPicker() {
  const [modelDraft, setModelDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOptions() {
    if (!THAI_LLM_TOKEN) {
      setError(
        "ยังไม่ได้ตั้งค่า VITE_THAILLM_API_KEY จึงโหลดรายการโมเดลไม่ได้",
      );
      setOptions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(THAI_LLM_MODELS_API_PATH, {
        headers: { Authorization: `Bearer ${THAI_LLM_TOKEN}` },
      });
      const payload = (await response
        .json()
        .catch(() => null)) as ModelsApiResponse | null;

      if (!response.ok) throw new Error("ไม่สามารถโหลดรายการโมเดลได้");

      const parsed = parseModelOptions(payload);
      if (parsed.length === 0)
        throw new Error("API ไม่ได้ส่งรายการโมเดลกลับมา");

      setOptions(parsed);
    } catch {
      setOptions([]);
      setError("โหลดรายการโมเดลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  function open(currentModel: string) {
    setModelDraft(currentModel);
    setIsOpen(true);
    if (options.length === 0 && !isLoading) {
      void fetchOptions();
    }
  }

  function close() {
    setIsOpen(false);
    setModelDraft("");
  }

  return {
    modelDraft,
    setModelDraft,
    isOpen,
    options,
    isLoading,
    error,
    fetchOptions,
    open,
    close,
  };
}
