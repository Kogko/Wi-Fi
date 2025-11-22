# แก้ไขปัญหา n8n ไม่สามารถเชื่อมต่อ API

## 🔴 ปัญหา
Error: **"The service refused the connection - perhaps it is offline"**

## ✅ สาเหตุ
n8n ใช้ URL `http://localhost:3000/api/generate` แต่ n8n อยู่ใน Docker container
- `localhost` ใน Docker container = container เอง ไม่ใช่ host machine
- ต้องใช้ `host.docker.internal` หรือ IP address โดยตรง

## 🔧 วิธีแก้ไข

### วิธีที่ 1: เปลี่ยน URL ใน n8n (แนะนำ - ง่ายที่สุด)

1. เปิด n8n workflow
2. คลิกที่ node **"HTTP Request2"**
3. เปลี่ยน **URL** จาก:
   ```
   http://localhost:3000/api/generate
   ```
   เป็น:
   ```
   http://172.21.65.222:3000/api/generate
   ```
   หรือ
   ```
   http://host.docker.internal:3000/api/generate
   ```

4. คลิก **"Execute step"** เพื่อทดสอบ

---

### วิธีที่ 2: ตั้งค่า docker-compose.yml

ถ้าใช้ `host.docker.internal` ต้องเพิ่ม `extra_hosts` ใน docker-compose.yml:

```yaml
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    extra_hosts:
      - "host.docker.internal:host-gateway"
    # หรือใช้ IP โดยตรง:
    # extra_hosts:
    #   - "host.docker.internal:172.21.65.222"
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

**หลังจากแก้ไข:**
```bash
docker-compose down
docker-compose up -d
```

---

## 🧪 ทดสอบการเชื่อมต่อ

### ทดสอบจาก Host Machine
```powershell
# ตรวจสอบ server
curl http://localhost:3000/health

# ทดสอบ API
curl http://localhost:3000/api/generate -o test.pdf
```

### ทดสอบจาก Docker Container
```bash
# เข้าไปใน n8n container
docker exec -it <n8n-container-name> sh

# ทดสอบ host.docker.internal
curl http://host.docker.internal:3000/health

# หรือทดสอบ IP โดยตรง
curl http://172.21.65.222:3000/health
```

---

## 📋 Checklist

- [ ] Server รันอยู่ (ตรวจสอบ: `curl http://localhost:3000/health`)
- [ ] เปลี่ยน URL ใน n8n เป็น `http://172.21.65.222:3000/api/generate`
- [ ] Firewall เปิดพอร์ต 3000 (ตรวจสอบ: `Get-NetFirewallRule -DisplayName "Allow Port 3000"`)
- [ ] ทดสอบ workflow ใน n8n อีกครั้ง

---

## ⚠️ หมายเหตุ

### IP Address อาจเปลี่ยน
หลังรีสตาร์ทเครื่อง IP address อาจเปลี่ยน (ถ้าใช้ DHCP)

**ตรวจสอบ IP ใหม่:**
```powershell
ipconfig | findstr IPv4
```

**แก้ไข:**
- ตั้งค่า Static IP ใน Windows Network Settings
- หรืออัปเดต URL ใน n8n ทุกครั้งที่ IP เปลี่ยน

### Firewall
ตรวจสอบว่า Firewall เปิดพอร์ต 3000:
```powershell
# ตรวจสอบ
Get-NetFirewallRule -DisplayName "Allow Port 3000"

# ถ้าไม่มี ให้สร้าง (รันแบบ Administrator)
netsh advfirewall firewall add rule name="Allow Port 3000" dir=in action=allow protocol=TCP localport=3000
```

---

## 🎯 สรุป

**แก้ไขง่ายที่สุด:**
1. เปลี่ยน URL ใน n8n จาก `http://localhost:3000/api/generate`
2. เป็น `http://172.21.65.222:3000/api/generate`
3. ทดสอบ workflow อีกครั้ง

**ถ้ายังไม่ได้:**
- ตรวจสอบว่า server รันอยู่
- ตรวจสอบ Firewall
- ตรวจสอบ IP address ใหม่

