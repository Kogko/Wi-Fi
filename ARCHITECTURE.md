# Wi-Fi Credential Generator - Architecture Documentation

## 📋 Overview

Wi-Fi Credential Generator เป็น REST API service ที่สร้าง Wi-Fi credentials 20 รายการ (10 ซ้าย, 10 ขวา) พร้อมบันทึกไฟล์ JSON, CSV, และ PDF สำหรับใช้งานกับ n8n workflow automation

---

## 🏗️ Architecture

### Architecture Pattern
- **RESTful API** - Express.js-based HTTP API
- **Modular Design** - แยก concerns เป็น modules ตามหน้าที่
- **File-based Storage** - เก็บข้อมูลในรูปแบบไฟล์ (JSON, CSV, PDF)
- **Client-Server** - API server ที่รอรับ request จาก n8n หรือ clients อื่นๆ

### Network Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   n8n       │  HTTP   │  Node.js API │  File   │  File       │
│  (Docker)   │ ──────> │  (Port 3000) │ ──────> │  System     │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ HTTP
                              ▼
                        ┌──────────────┐
                        │ Print Service│
                        │ (Port 5000)  │
                        └──────────────┘
```

---

## 🛠️ Frameworks & Technologies

### Core Technologies
- **Node.js** (v25.0.0+) - Runtime environment
- **Express.js** (^4.18.2) - Web framework สำหรับ REST API
- **PDFKit** (^0.13.0) - PDF generation library
- **csv-writer** (^1.6.0) - CSV file writing

### Development Tools
- **nodemon** (^3.0.1) - Auto-reload สำหรับ development

### System Integration
- **PowerShell** - Windows automation scripts
- **SumatraPDF** (optional) - Silent PDF printing
- **Windows Task Scheduler** - Auto-start on boot

### External Services
- **n8n** - Workflow automation (runs in Docker)
- **Docker** - Containerization สำหรับ n8n

---

## 📁 Folder Structure

```
WIFI-GENER/
├── server.js                      # Main Express server & API endpoints
├── package.json                   # Dependencies & scripts
├── package-lock.json              # Locked dependencies
├── README.md                      # User documentation
├── ARCHITECTURE.md                # This file
│
├── generators/                    # Business logic layer
│   └── wifiGenerator.js           # Credential generation logic
│
├── templates/                     # Presentation layer
│   └── cardTemplate.js            # PDF template & layout
│
├── utils/                         # Utility functions
│   ├── fileManager.js             # File I/O operations
│   ├── printManager.js            # PDF printing logic
│   └── print-with-default-switch.ps1  # PowerShell print helper
│
├── assets/                        # Static assets
│   └── tbk-group.png             # Company logo
│
├── data/                          # Data storage
│   └── history.json               # Used credential IDs (prevent duplicates)
│
├── output/                        # Generated files (JSON)
│   └── YYYYMMDD.json
│
├── CSV/                           # Generated CSV files
│   └── YYYYMMDD.csv
│
├── Wi-Fi tricket/                 # Generated PDF files
│   └── DD-MM-YYYY.pdf
│
├── setup-auto-start.ps1          # Windows auto-start setup script
├── check-status.ps1               # Status checking script
├── print-service.ps1              # HTTP print service (PowerShell)
│
└── docker-compose-n8n-example.yml # Docker config example for n8n
```

---

## 🔧 Key Components

### 1. Server (`server.js`)
**หน้าที่:** Express server และ API endpoints

**Endpoints:**
- `GET /health` - Health check
- `GET /api/generate` - Generate credentials & return PDF
- `POST /api/generate` - Generate credentials & return PDF
- `GET /api/generate/print` - Generate & return HTML with auto-print
- `GET /print/latest` - Return HTML with latest PDF (auto-print)
- `POST /api/print/latest` - Server-side print latest PDF

**Features:**
- Listens on `0.0.0.0` (accessible from Docker containers)
- Error handling with try-catch
- CSV save failures don't block PDF generation
- Supports query parameter `?print=true` for auto-print

### 2. Credential Generator (`generators/wifiGenerator.js`)
**หน้าที่:** สร้าง Wi-Fi credentials ที่ไม่ซ้ำกัน

**Functions:**
- `generateCredentials(count)` - สร้าง credentials จำนวนที่กำหนด
- `generateGuestLastName()` - สร้าง 2 ตัวอักษร + 2 ตัวเลข
- `generatePassword()` - สร้าง 6 ตัวอักษร (lowercase + numbers)
- `calculateExpirationDate()` - คำนวณวันหมดอายุ (สร้าง + 7 วัน)

**Features:**
- Duplicate prevention (checks batch + history)
- History persistence (`data/history.json`)
- Format: `TBKG-XXXX` (username), 6-char password
- SSID: `TBKK-Guest` (fixed)

### 3. File Manager (`utils/fileManager.js`)
**หน้าที่:** จัดการการบันทึกไฟล์ JSON, CSV, PDF

**Functions:**
- `saveJSON(credentials)` - บันทึก JSON
- `saveCSV(credentials)` - บันทึก CSV (with retry mechanism)
- `savePDF(pdfBuffer)` - บันทึก PDF
- `getLatestPdf()` - ดึงไฟล์ PDF ล่าสุด
- `getDateFilename(ext)` - สร้างชื่อไฟล์ (YYYYMMDD)
- `getDateFilenameDisplay(ext)` - สร้างชื่อไฟล์ (DD-MM-YYYY)

**Features:**
- Automatic directory creation
- CSV retry mechanism (3 attempts, 500ms delay) for file locking
- Separate directories: `output/`, `CSV/`, `Wi-Fi tricket/`
- Date-based filenames

### 4. PDF Template (`templates/cardTemplate.js`)
**หน้าที่:** สร้าง PDF layout สำหรับ Wi-Fi credential cards

**Functions:**
- `createPDF(credentials)` - สร้าง PDF document

**Layout:**
- A4 page size
- 2 columns × 10 rows = 20 cards per page
- Margins: top/bottom 45pt, left/right 40pt
- Card dimensions: calculated dynamically
- Logo support (JPG, PNG) from `assets/` folder
- Fallback to "TBK Group" text if no logo

**Features:**
- Print-ready PDF (PDF version 1.4)
- Minimalist design (white background, black text)
- Thin black borders between cards
- Logo embedding with fallback
- All 20 cards fit on single page

### 5. Print Manager (`utils/printManager.js`)
**หน้าที่:** จัดการการพิมพ์ PDF

**Functions:**
- `printPDF(filePath, printerName)` - Print PDF file

**Print Methods:**
1. **SumatraPDF** (preferred) - Silent printing
2. **PowerShell fallback** - Uses Edge/Chrome headless

**Features:**
- Automatic printer detection
- Silent printing support
- Error handling

### 6. Print Service (`print-service.ps1`)
**หน้าที่:** HTTP service สำหรับรับคำสั่งพิมพ์จาก Docker containers

**Endpoints:**
- `GET /health` - Service status
- `POST /print/latest` - Print latest PDF

**Features:**
- Runs on Windows host
- Accessible from Docker containers
- Supports SumatraPDF or default print verb
- Configurable printer name

### 7. Auto-Start Scripts
**`setup-auto-start.ps1`:**
- Creates Windows Scheduled Task
- Configures Firewall rules
- Sets up auto-restart on crash

**`check-status.ps1`:**
- Checks server status
- Verifies Scheduled Task
- Tests Firewall rules
- Health check API

---

## 🔄 Data Flow

### Generate Credentials Flow
```
1. n8n → HTTP Request → /api/generate
2. server.js → generateCredentials(20)
3. wifiGenerator.js → Generate unique credentials
4. fileManager.js → Save JSON, CSV, PDF
5. cardTemplate.js → Create PDF layout
6. server.js → Return PDF buffer
7. n8n → Receive PDF file
```

### Print Flow
```
1. n8n → HTTP Request → /api/print/latest
2. server.js → getLatestPdf()
3. fileManager.js → Find latest PDF
4. printManager.js → printPDF()
5. SumatraPDF/PowerShell → Print to printer
```

### Auto-Print HTML Flow
```
1. n8n → HTTP Request → /print/latest
2. server.js → getLatestPdf()
3. server.js → Embed PDF as base64 in HTML
4. Browser → Auto-trigger print dialog
```

---

## 🔐 Security Considerations

- **Network Access:** Server listens on `0.0.0.0` (all interfaces) - ensure firewall is configured
- **File Permissions:** Files saved with default permissions
- **No Authentication:** API endpoints are unauthenticated (suitable for internal network)
- **Input Validation:** Limited - assumes trusted clients

---

## 🚀 Deployment

### Development
```bash
npm run dev  # Uses nodemon for auto-reload
```

### Production
```bash
npm start  # Runs node server.js
```

### Auto-Start on Boot
```powershell
.\setup-auto-start.ps1  # Creates Scheduled Task
```

### Docker Integration
- Server accessible via `http://host.docker.internal:3000` or direct IP
- Print service accessible via `http://host.docker.internal:5000`
- Requires `extra_hosts` in docker-compose.yml

---

## 📊 Data Formats

### Credential Object
```javascript
{
  guestFirstName: "Guest",
  guestLastName: "BM07",        // 2 letters + 2 numbers
  guestEmail: "",
  guestPhone: "",
  guestId: "TBKG-BM07",         // TBKG- + lastName
  password: "abc123",           // 6 chars (lowercase + numbers)
  sponsorId: "",
  sponsorName: "",
  sponsorEmail: "",
  ssid: "TBKK-Guest",           // Fixed
  expiration: "14/11/25"        // DD/MM/YY (create date + 7 days)
}
```

### CSV Format
- Headers: Guest's First Name, Guest's Last Name, Guest's Email, Guest's Phone, Guest's ID, Guest's password, Sponsor's First Name, Sponsor's Last Name, Sponsor's Email
- Encoding: UTF-8
- Delimiter: Comma

### PDF Format
- Size: A4 (210mm × 297mm)
- Version: PDF 1.4
- Layout: 2 columns × 10 rows
- Print-ready: Yes

---

## 🔍 Error Handling

- **CSV Save Failures:** Logged but don't block PDF generation
- **PDF Generation:** Errors return 500 status with error message
- **File Locking:** Retry mechanism (3 attempts) for CSV files
- **Print Failures:** Logged, fallback to alternative methods
- **Missing Files:** Returns 404 with descriptive message

---

## 📝 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)

### File Paths (Hardcoded)
- `data/history.json` - Credential history
- `output/` - JSON files
- `CSV/` - CSV files
- `Wi-Fi tricket/` - PDF files
- `assets/` - Logo files

### Network Configuration
- Server: `0.0.0.0:3000` (all interfaces)
- Print Service: `+:5000` (all interfaces, requires admin)

---

## 🎯 Design Decisions

1. **File-based Storage:** Simple, no database required
2. **Separate Directories:** Clear organization (JSON, CSV, PDF)
3. **Date-based Filenames:** Easy to find files by date
4. **History Tracking:** Prevents duplicate credentials across runs
5. **Retry Mechanism:** Handles Windows file locking issues
6. **Modular Design:** Easy to test and maintain
7. **Print Service Separation:** Allows Docker containers to trigger printing
8. **Auto-print HTML:** Browser-based printing for flexibility

---

## 🔮 Future Enhancements

- Database integration (replace file-based storage)
- Authentication/Authorization
- API rate limiting
- Webhook support
- Email delivery
- Multi-language support
- Customizable templates
- Batch operations
- Admin dashboard

