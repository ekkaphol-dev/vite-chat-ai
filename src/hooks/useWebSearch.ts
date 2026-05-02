import { useCallback } from "react";
import {
  WEB_SEARCH_COUNT_OPTIONS,
  WEB_SEARCH_PROXY_PATH,
  WEB_SEARCH_REGION_OPTIONS,
  WEB_SEARCH_TIMEOUT_MS,
} from "../config";
import { toSearchEntry, toWebSource } from "../lib/domain";
import { formatCurrentDate } from "../lib/format";
import type { WebSource } from "../types/chat";

export type WebSearchRegionValue =
  (typeof WEB_SEARCH_REGION_OPTIONS)[number]["value"];

export type WebSearchContext = {
  context: string;
  sources: WebSource[];
};

type SerperResult = {
  title: string;
  link: string;
  snippet?: string;
};

type SerperSearchResponse = {
  organic?: SerperResult[];
  news?: SerperResult[];
};

export function isWebSearchRegionValue(
  value: string,
): value is WebSearchRegionValue {
  return WEB_SEARCH_REGION_OPTIONS.some((item) => item.value === value);
}

export function getNextSearchCount(current: number): number {
  const index = WEB_SEARCH_COUNT_OPTIONS.indexOf(
    current as (typeof WEB_SEARCH_COUNT_OPTIONS)[number],
  );
  if (index === -1 || index === WEB_SEARCH_COUNT_OPTIONS.length - 1) {
    return WEB_SEARCH_COUNT_OPTIONS[0];
  }
  return WEB_SEARCH_COUNT_OPTIONS[index + 1];
}

export function getNextSearchRegion(
  current: WebSearchRegionValue,
): WebSearchRegionValue {
  const index = WEB_SEARCH_REGION_OPTIONS.findIndex(
    (item) => item.value === current,
  );
  if (index === -1 || index === WEB_SEARCH_REGION_OPTIONS.length - 1) {
    return WEB_SEARCH_REGION_OPTIONS[0].value;
  }
  return WEB_SEARCH_REGION_OPTIONS[index + 1].value;
}

function getSerperRegionParams(
  region: WebSearchRegionValue,
): Record<string, string> {
  switch (region) {
    case "th-th":
      return { gl: "th", hl: "th" };
    case "us-en":
      return { gl: "us", hl: "en" };
    default:
      return {};
  }
}

type UseWebSearchOptions = {
  enabled: boolean;
  count: number;
  region: WebSearchRegionValue;
};

export function useWebSearch({ enabled, count, region }: UseWebSearchOptions) {
  const buildContext = useCallback(
    async (query: string): Promise<WebSearchContext | null> => {
      if (!enabled) return null;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        WEB_SEARCH_TIMEOUT_MS,
      );

      try {
        const response = await fetch(WEB_SEARCH_PROXY_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: query,
            num: count,
            ...getSerperRegionParams(region),
          }),
          signal: controller.signal,
        });

        if (!response.ok) return null;

        const json = (await response.json()) as SerperSearchResponse;
        const items = [...(json.news ?? []), ...(json.organic ?? [])];

        const entries = items
          .filter((item) => item.title && item.link)
          .map((item) => toSearchEntry(item.title, item.link, item.snippet))
          .filter((e): e is NonNullable<typeof e> => e !== null);

        const deduped = entries.filter(
          (e, i, all) => all.findIndex((x) => x.url === e.url) === i,
        );
        const selected = [
          ...deduped.filter((e) => e.trusted),
          ...deduped.filter((e) => !e.trusted),
        ].slice(0, count);

        if (selected.length === 0) return null;

        const lines = selected.map(
          (e) => `- ${e.title}${e.snippet ? `: ${e.snippet}` : ""} (${e.url})`,
        );

        return {
          context: `วันที่ปัจจุบัน: ${formatCurrentDate()}\nข้อมูลจากการค้นเว็บล่าสุด (ใช้ประกอบคำตอบ):\n${lines.join("\n")}`,
          sources: selected.map(toWebSource),
        };
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [enabled, count, region],
  );

  return { buildContext };
}
