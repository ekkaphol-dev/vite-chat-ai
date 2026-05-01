import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RateLimitStatus = "safe" | "warning" | "danger" | "cooldown";

type UseRateLimitOptions = {
  perSecond: number;
  perMinute: number;
  noticeCooldownMs: number;
};

type ConsumeResult = {
  allowed: boolean;
  retryAfterMs: number;
};

type UseRateLimitResult = {
  cooldownRemainingMs: number;
  remainingInSecond: number;
  remainingInMinute: number;
  usageBuckets: number[];
  status: RateLimitStatus;
  consume: () => ConsumeResult;
  shouldShowRateLimitNotice: () => boolean;
};

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60_000;
const BUCKET_COUNT = 12;
const BUCKET_MS = ONE_MINUTE_MS / BUCKET_COUNT;

export function useRateLimit({
  perSecond,
  perMinute,
  noticeCooldownMs,
}: UseRateLimitOptions): UseRateLimitResult {
  const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const lastNoticeAtRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const minuteRequests = useMemo(
    () =>
      requestTimestamps.filter(
        (timestamp) => timestamp > clockMs - ONE_MINUTE_MS,
      ),
    [requestTimestamps, clockMs],
  );

  const secondRequests = useMemo(
    () =>
      minuteRequests.filter((timestamp) => timestamp > clockMs - ONE_SECOND_MS),
    [minuteRequests, clockMs],
  );

  const cooldownRemainingMs =
    cooldownUntil === null ? 0 : Math.max(0, cooldownUntil - clockMs);

  const remainingInSecond = Math.max(0, perSecond - secondRequests.length);
  const remainingInMinute = Math.max(0, perMinute - minuteRequests.length);

  const usageBuckets = useMemo(() => {
    const buckets = Array.from({ length: BUCKET_COUNT }, () => 0);

    minuteRequests.forEach((timestamp) => {
      const ageMs = clockMs - timestamp;
      const bucketFromRight = Math.floor(ageMs / BUCKET_MS);

      if (bucketFromRight >= 0 && bucketFromRight < BUCKET_COUNT) {
        const index = BUCKET_COUNT - 1 - bucketFromRight;
        buckets[index] += 1;
      }
    });

    return buckets;
  }, [minuteRequests, clockMs]);

  const status = useMemo<RateLimitStatus>(() => {
    if (cooldownRemainingMs > 0) {
      return "cooldown";
    }

    const secondRatio = remainingInSecond / perSecond;
    const minuteRatio = remainingInMinute / perMinute;

    if (secondRatio <= 0.2 || minuteRatio <= 0.1) {
      return "danger";
    }

    if (secondRatio <= 0.5 || minuteRatio <= 0.3) {
      return "warning";
    }

    return "safe";
  }, [
    cooldownRemainingMs,
    remainingInSecond,
    perSecond,
    remainingInMinute,
    perMinute,
  ]);

  const consume = useCallback((): ConsumeResult => {
    const now = Date.now();
    const minuteBoundary = now - ONE_MINUTE_MS;
    const secondBoundary = now - ONE_SECOND_MS;

    const recentRequests = requestTimestamps.filter(
      (timestamp) => timestamp > minuteBoundary,
    );

    if (recentRequests.length >= perMinute) {
      const retryAfterMs = ONE_MINUTE_MS - (now - recentRequests[0]);
      setCooldownUntil((current) => Math.max(current ?? 0, now + retryAfterMs));
      return { allowed: false, retryAfterMs };
    }

    const requestsInSecond = recentRequests.filter(
      (timestamp) => timestamp > secondBoundary,
    );

    if (requestsInSecond.length >= perSecond) {
      const retryAfterMs = ONE_SECOND_MS - (now - requestsInSecond[0]);
      setCooldownUntil((current) => Math.max(current ?? 0, now + retryAfterMs));
      return { allowed: false, retryAfterMs };
    }

    setRequestTimestamps([...recentRequests, now]);
    return { allowed: true, retryAfterMs: 0 };
  }, [requestTimestamps, perMinute, perSecond]);

  const shouldShowRateLimitNotice = useCallback(() => {
    const now = Date.now();
    if (now - lastNoticeAtRef.current <= noticeCooldownMs) {
      return false;
    }

    lastNoticeAtRef.current = now;
    return true;
  }, [noticeCooldownMs]);

  return {
    cooldownRemainingMs,
    remainingInSecond,
    remainingInMinute,
    usageBuckets,
    status,
    consume,
    shouldShowRateLimitNotice,
  };
}
