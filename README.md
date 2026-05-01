# Vite Chat AI

หน้าแชต React + Vite ที่เชื่อมกับ ThaiLLM API จริง

## Setup

1. ใช้ Node.js เวอร์ชันที่รองรับ (แนะนำ Node 22)

```bash
nvm use
```

1. ติดตั้งแพ็กเกจ

```bash
npm install
```

1. สร้างไฟล์ `.env` จาก `.env.example`

```bash
cp .env.example .env
```

1. ใส่ค่า API config ใน `.env`

```env
VITE_THAILLM_API_KEY=your_real_api_key
VITE_THAILLM_MODEL=typhoon-s-thaillm-8b-instruct
VITE_THAILLM_TEMPERATURE=0.3
VITE_THAILLM_MAX_TOKENS=2048
VITE_WEB_SEARCH_TRUSTED_DOMAINS=wikipedia.org,reuters.com,who.int
```

1. รันโปรเจกต์

```bash
npm run dev
```

## API ที่ใช้

- URL (frontend เรียกผ่าน proxy): `/api/v1/chat/completions`
- Upstream: `http://thaillm.or.th/api/v1/chat/completions`
- รายการโมเดล: `GET /api/v1/models`
- Model: กำหนดผ่าน `VITE_THAILLM_MODEL` (ค่าเริ่มต้น `typhoon-s-thaillm-8b-instruct`)
- Temperature: กำหนดผ่าน `VITE_THAILLM_TEMPERATURE` (ค่าเริ่มต้น `0.3`)
- Max tokens: กำหนดผ่าน `VITE_THAILLM_MAX_TOKENS` (ค่าเริ่มต้น `2048`)

## หมายเหตุ

- ถ้าแก้ไฟล์ `vite.config.ts` แล้ว ให้หยุดและรัน `npm run dev` ใหม่อีกครั้งเพื่อให้ proxy ทำงาน

## ฟีเจอร์

- ส่งข้อความและรับคำตอบจาก AI จริง
- มีหน้าเลือกโมเดลจาก API (`/api/v1/models`) และจำโมเดลล่าสุดอัตโนมัติ
- เลือกโมเดลได้ทั้ง shorthand เช่น `openthaigpt` และ full lowercase เช่น `openthaigpt-thaillm-8b-instruct-v7.2`
- มีโหมด Web Search (เปิด/ปิดได้) เพื่อดึงข้อมูลเว็บล่าสุดก่อนสรุปคำตอบ
- ปรับจำนวนแหล่งค้นเว็บได้จากปุ่ม `Sources` (3 → 5 → 8)
- ปรับภูมิภาคผลค้นเว็บได้จากปุ่ม `Region` (TH → Global → US)
- แสดงแหล่งอ้างอิงแบบลิงก์คลิกได้ใต้ข้อความคำตอบ
- แสดง badge จำนวนแหล่งอ้างอิงในแต่ละคำตอบ
- จัดลำดับผลค้นจากโดเมนที่น่าเชื่อถือก่อน และ fallback โดเมนทั่วไปเมื่อข้อมูลไม่พอ
- สลับธีม Light/Dark/System ด้วยปุ่มไอคอน และจำค่าธีมล่าสุดอัตโนมัติ
- มี tooltip แบบการ์ดอธิบายการสลับธีมเมื่อ hover/focus ปุ่มธีม
- tooltip ปรับตำแหน่งอัตโนมัติเมื่ออยู่ใกล้ขอบจอ
- ไอคอนธีมมี animation แยกตามโหมด (sun/moon/system)
- จำกัดอัตราการเรียก API ที่ 5 requests/second และ 200 requests/minute
- เมื่อชนลิมิต ปุ่มส่งจะถูกล็อกชั่วคราวพร้อมนับถอยหลัง
- แสดงโควต้าคงเหลือแบบเรียลไทม์ใต้กล่องพิมพ์
- สีสถานะโควต้า: เขียว (ปลอดภัย), เหลือง (ใกล้ลิมิต), แดง (ติดลิมิต/ใกล้วิกฤต)
- มีปุ่ม ? สำหรับดูคำอธิบายสีสถานะทันที
- มีกราฟแท่งย่อแสดงการใช้โควต้าย้อนหลัง 60 วินาที
- ลดข้อความเตือน rate limit ซ้ำในหน้าต่างแชต
- แสดงสถานะกำลังพิมพ์
- กด Enter เพื่อส่ง และ Shift+Enter ขึ้นบรรทัดใหม่
- บันทึกประวัติแชตใน localStorage
- ปุ่มล้างบทสนทนา

## Web Search Mode

- เปิดโหมดนี้จากปุ่ม `Web Search On/Off` ในส่วนหัว
- ระบบจะค้นข้อมูลจากเว็บก่อน และส่งบริบทให้ AI สรุปเป็นภาษาไทยพร้อมแหล่งอ้างอิง
- ปุ่ม `Sources` ใช้ปรับจำนวนแหล่งข้อมูลที่แนบต่อคำตอบ
- ปุ่ม `Region` ใช้ปรับภูมิภาคของผลค้นเว็บเพื่อเพิ่มความตรงบริบท
- ถ้ากำหนด `VITE_WEB_SEARCH_TRUSTED_DOMAINS` ระบบจะจัดลำดับโดเมนที่กำหนดไว้ก่อน
- หากค้นไม่สำเร็จ ระบบจะตอบด้วยโมเดลตามปกติ

## โครงสร้างคอมโพเนนต์

- `ChatHeader`: ส่วนหัว, ปุ่มเปลี่ยนธีม, ปุ่มล้างแชต
- `MessageList`: แสดงรายการข้อความและสถานะกำลังพิมพ์
- `ChatComposer`: ช่องพิมพ์, ปุ่มส่ง, สถานะ/กราฟ rate limit
