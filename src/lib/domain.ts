import { DEFAULT_WEB_SEARCH_TRUSTED_DOMAINS } from "../config";
import type { WebSource } from "../types/chat";

export type SearchEntry = {
  title: string;
  url: string;
  domain: string;
  trusted: boolean;
  snippet?: string;
};

function parseDomainList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((d) =>
      d
        .trim()
        .toLowerCase()
        .replace(/^www\./, ""),
    )
    .filter(Boolean);
}

export const WEB_SEARCH_TRUSTED_DOMAINS = (() => {
  const custom = parseDomainList(
    import.meta.env.VITE_WEB_SEARCH_TRUSTED_DOMAINS,
  );
  return custom.length > 0 ? custom : DEFAULT_WEB_SEARCH_TRUSTED_DOMAINS;
})();

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isTrustedDomain(domain: string): boolean {
  return WEB_SEARCH_TRUSTED_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

export function toSearchEntry(
  title: string,
  url: string,
  snippet?: string,
): SearchEntry | null {
  const domain = extractDomain(url);
  if (!domain) return null;
  return { title, url, domain, trusted: isTrustedDomain(domain), snippet };
}

export function toWebSource(entry: SearchEntry): WebSource {
  return {
    title: entry.title,
    url: entry.url,
    domain: entry.domain,
    trusted: entry.trusted,
  };
}
