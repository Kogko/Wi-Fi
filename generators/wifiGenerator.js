/**
 * Wi-Fi Credential Generator
 * สร้าง credentials 20 รายการ (10 ซ้าย, 10 ขวา)
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

// Load history
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
  return new Set();
}

// Save history
function saveHistory(usedIds) {
  try {
    const data = JSON.stringify([...usedIds]);
    fs.writeFileSync(HISTORY_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

function generateRandomString(length, charset) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

function generateGuestLastName() {
  // 2 ตัวอักษรภาษาอังกฤษ + 2 ตัวเลข
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const letterPart = generateRandomString(2, letters);
  const numberPart = generateRandomString(2, numbers);
  return letterPart + numberPart;
}

function generatePassword() {
  // 6 ตัวอักษร (ตัวพิมพ์เล็ก + ตัวเลข)
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return generateRandomString(6, charset);
}

function calculateExpirationDate() {
  // คำนวณจากวันที่สร้าง + 7 วัน
  const today = new Date();
  const expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + 7);

  // รูปแบบ DD/MM/YY
  const day = String(expirationDate.getDate()).padStart(2, '0');
  const month = String(expirationDate.getMonth() + 1).padStart(2, '0');
  const year = String(expirationDate.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

function generateCredentials(count = 20) {
  const credentials = [];
  const usedLastNames = new Set();
  const usedPasswords = new Set();

  // Load global history
  const globalHistory = loadHistory();

  for (let i = 0; i < count; i++) {
    let lastName, password;

    // สร้าง Guest's Last Name ที่ไม่ซ้ำ (เช็คทั้งใน batch และ history)
    let attempts = 0;
    do {
      lastName = generateGuestLastName();
      attempts++;
      if (attempts > 1000) {
        throw new Error('Cannot generate unique ID: Pool exhausted');
      }
    } while (usedLastNames.has(lastName) || globalHistory.has(`TBKG-${lastName}`));

    usedLastNames.add(lastName);
    globalHistory.add(`TBKG-${lastName}`);

    // สร้าง Password ที่ไม่ซ้ำ
    do {
      password = generatePassword();
    } while (usedPasswords.has(password));
    usedPasswords.add(password);

    const guestId = `TBKG-${lastName}`;
    const expirationDate = calculateExpirationDate();

    credentials.push({
      guestFirstName: 'Guest',
      guestLastName: lastName,
      guestEmail: '',
      guestPhone: '',
      guestId: guestId,
      password: password,
      sponsorId: '',
      sponsorName: '',
      sponsorEmail: '',
      ssid: 'TBKK-Guest',
      expiration: expirationDate
    });
  }

  // Save updated history
  saveHistory(globalHistory);

  return credentials;
}

module.exports = {
  generateCredentials
};
