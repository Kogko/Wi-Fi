# Wi-Fi Credential Generator API

API endpoint สำหรับ generate Wi-Fi credentials 20 รายการ (10 ซ้าย 10 ขวา) พร้อมบันทึกไฟล์ JSON/CSV/PDF และส่งคืน PDF

## คุณสมบัติ

- สร้าง Wi-Fi credentials 20 รายการ (10 ซ้าย, 10 ขวา)
- Username: TBKG-XXXX (2 ตัวอักษรภาษาอังกฤษ + 2 ตัวเลข) เช่น TBKG-BM07
- Password: 6 ตัวอักษร (ตัวพิมพ์เล็ก + ตัวเลข)
- SSID: TBKK-Guest (คงที่)
- วันหมดอายุ: คำนวณจากวันที่สร้าง + 7 วัน (รูปแบบ DD/MM/YY)
- ทุกช่องไม่ซ้ำกัน
- บันทึกไฟล์ JSON, CSV, และ PDF ในโฟลเดอร์ `output/`
- ชื่อไฟล์ตามวันเดือนปี (YYYYMMDD)

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

## การใช้งาน

### เริ่มต้น server แบบปกติ

1. เริ่มต้น server:
```bash
npm start
```

หรือใช้ nodemon สำหรับ development:
```bash
npm run dev
```

### ตั้งค่าให้รันอัตโนมัติเมื่อรีสตาร์ทเครื่อง

**วิธีที่ 1: ใช้ Scheduled Task (แนะนำ)**

รัน PowerShell แบบ Administrator:
```powershell
cd C:\Users\apisit_p\Holycrab\WIFI-GENER
.\setup-auto-start.ps1
```

สคริปต์จะ:
- สร้าง Scheduled Task ให้ server รันอัตโนมัติเมื่อรีสตาร์ท
- ตั้งค่า Firewall Rule สำหรับพอร์ต 3000
- Restart อัตโนมัติถ้า server crash

**ตรวจสอบสถานะ:**
```powershell
.\check-status.ps1
```

**หมายเหตุ:** หลังรีสตาร์ท IP address อาจเปลี่ยน (ถ้าใช้ DHCP) ตรวจสอบ IP ใหม่ด้วย:
```powershell
ipconfig | findstr IPv4
```

2. เรียกใช้ API endpoint:
```bash
# GET request
curl http://localhost:3000/api/generate --output wifi-credentials.pdf

# POST request
curl -X POST http://localhost:3000/api/generate --output wifi-credentials.pdf
```

3. Health check:
```bash
curl http://localhost:3000/health
```

## การใช้งานกับ n8n

1. **เปิดพอร์ต 3000 ใน Windows Firewall** (ต้องรัน PowerShell แบบ Administrator):
   ```powershell
   netsh advfirewall firewall add rule name="Allow Port 3000" dir=in action=allow protocol=TCP localport=3000
   ```

2. สร้าง HTTP Request node ใน n8n
3. ตั้งค่า Method เป็น `GET` หรือ `POST`
4. ตั้งค่า URL เป็น:
   - **แนะนำ:** `http://172.21.65.222:3000/api/generate` (ใช้ IP address โดยตรง - ใช้งานได้แน่นอน)
   - หรือ `http://host.docker.internal:3000/api/generate` (ถ้า Docker รองรับ - อาจต้องเพิ่ม `extra_hosts` ใน docker-compose)
5. ตั้งค่า Response Format เป็น `File`
6. ตั้งค่า Schedule Trigger ให้ทำงานทุกวันจันทร์

> **หมายเหตุสำคัญ:**
> - ถ้า `host.docker.internal` ไม่ทำงาน ให้ใช้ IP address โดยตรง (`172.21.65.222`) แทน
> - **หลังรีสตาร์ทเครื่อง IP address อาจเปลี่ยน** (ถ้าใช้ DHCP) ตรวจสอบ IP ใหม่ด้วย: `ipconfig | findstr IPv4`
> - ถ้าต้องการ IP address คงที่ แนะนำให้ตั้งค่า Static IP ใน Windows Network Settings

## Print Service (สำหรับสั่งพิมพ์อัตโนมัติ)

เรามีสคริปต์ PowerShell (`print-service.ps1`) ที่เปิด HTTP listener บน Windows เพื่อรับคำสั่งพิมพ์ไฟล์ PDF ล่าสุดในโฟลเดอร์ `Wi-Fi tricket/`

### การเตรียมเครื่องพิมพ์

1. ติดตั้ง [SumatraPDF](https://www.sumatrapdfreader.org/free-pdf-reader) (แนะนำสำหรับการพิมพ์แบบไร้หน้าต่าง)
2. จดชื่อเครื่องพิมพ์ที่จะใช้พิมพ์ (ผ่าน Control Panel หรือ `Get-Printer`)

### การเริ่มสคริปต์

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
cd C:\Users\<user>\WiFi-GENER
.\print-service.ps1 `
  -Port 5000 `
  -PdfDirectory "C:\Users\<user>\WiFi-GENER\Wi-Fi tricket" `
  -PrinterName "ชื่อเครื่องพิมพ์" `
  -SumatraPath "C:\Program Files\SumatraPDF\SumatraPDF.exe"
```

สคริปต์จะเปิด HTTP listener ที่ `http://+:5000/`

### Endpoint ที่ใช้งาน

- `GET http://localhost:5000/health` – ตรวจสอบสถานะ service
- `POST http://localhost:5000/print/latest` – สั่งพิมพ์ไฟล์ PDF ล่าสุดในโฟลเดอร์ที่ตั้งไว้ (คืน JSON ที่บอกชื่อไฟล์และเวลาพิมพ์)

### การใช้งานกับ n8n

Workflow ตัวอย่าง:

1. HTTP Request → `POST http://172.21.65.222:3000/api/generate` เพื่อสร้างไฟล์ใหม่
2. HTTP Request → `POST http://host.docker.internal:5000/print/latest` เพื่อสั่งให้ Windows host พิมพ์ไฟล์ล่าสุด

> หมายเหตุ: หากไม่ใช้ SumatraPDF สคริปต์จะ fallback ไปที่ `Start-Process -Verb Print` ซึ่งอาจมี dialog ขึ้นได้ในบางระบบ

## โครงสร้างโปรเจกต์

```
WIFI-GENER/
├── server.js              # Express server และ API endpoint
├── package.json           # Dependencies
├── generators/
│   └── wifiGenerator.js   # Logic สำหรับ generate credentials
├── utils/
│   └── fileManager.js     # จัดการบันทึกไฟล์ JSON/CSV/PDF
├── templates/
│   └── cardTemplate.js    # Template สำหรับสร้าง PDF
└── output/                # โฟลเดอร์เก็บไฟล์ที่ generate
```

## รูปแบบ CSV

ไฟล์ CSV ที่สร้างจะมีคอลัมน์ดังนี้:
- Guest's First Name: "Guest"
- Guest's Last Name: 2 ตัวอักษร + 2 ตัวเลข
- Guest's Email: ว่าง
- Guest's Phone: ว่าง
- Guest's ID: TBKG- + Guest's Last Name
- Guest's password: รหัสผ่าน 6 ตัวอักษร
- Sponsor's ID: ว่าง
- Sponsor's Name: ว่าง
- Sponsor's Email: ว่าง
- คอลัมน์ J, K: ว่าง

## Environment Variables

- `PORT`: Port ที่ server จะรัน (default: 3000)

## License

ISC

