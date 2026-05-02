export function getCurrentTime(): string {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function formatCurrentDateFull(): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function getErrorMessage(error: unknown): string {
  if (
    error instanceof TypeError &&
    error.message.toLowerCase().includes("failed to fetch")
  ) {
    return "เชื่อมต่อ API ไม่สำเร็จ อาจเกิดจากเครือข่ายหรือ CORS กรุณารีสตาร์ต dev server แล้วลองใหม่";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "เกิดข้อผิดพลาดระหว่างเรียกใช้บริการ AI";
}
