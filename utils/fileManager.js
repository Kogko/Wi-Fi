/**
 * File Manager
 * จัดการบันทึกไฟล์ JSON, CSV, และ PDF
 */

const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const CSV_DIR = path.join(__dirname, '..', 'CSV');
const PDF_DIR = path.join(__dirname, '..', 'Wi-Fi tricket');

// สร้างโฟลเดอร์ output ถ้ายังไม่มี
async function ensureOutputDir() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

// สร้างโฟลเดอร์ CSV ถ้ายังไม่มี
async function ensureCSVDir() {
  try {
    await fs.access(CSV_DIR);
  } catch {
    await fs.mkdir(CSV_DIR, { recursive: true });
  }
}

// สร้างโฟลเดอร์ PDF ถ้ายังไม่มี
async function ensurePdfDir() {
  try {
    await fs.access(PDF_DIR);
  } catch {
    await fs.mkdir(PDF_DIR, { recursive: true });
  }
}

// สร้างชื่อไฟล์ตามวันเดือนปี (YYYYMMDD)
function getDateFilename(extension) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}.${extension}`;
}

// สร้างชื่อไฟล์ตามวันเดือนปี (DD/MM/YYYY) สำหรับแสดงผล
function getDateFilenameDisplay(extension) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}.${extension}`;
}

// บันทึกไฟล์ JSON
async function saveJSON(credentials) {
  await ensureOutputDir();
  const filename = getDateFilename('json');
  const filepath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(credentials, null, 2), 'utf8');
  return filepath;
}

// บันทึกไฟล์ CSV
async function saveCSV(credentials) {
  await ensureCSVDir();
  const filename = getDateFilename('csv');
  const filepath = path.join(CSV_DIR, filename);
  
  const csvWriter = createCsvWriter({
    path: filepath,
    header: [
      { id: 'guestFirstName', title: "Guest's First Name (Required)" },
      { id: 'guestLastName', title: "Guest's Last Name (Required)" },
      { id: 'guestEmail', title: "Guest's Email" },
      { id: 'guestPhone', title: "Guest' Phone Number" },
      { id: 'guestId', title: "Guest's ID" },
      { id: 'password', title: "Guest's password" },
      { id: 'sponsorFirstName', title: "Sponsor's First Name" },
      { id: 'sponsorLastName', title: "Sponsor's Last Name" },
      { id: 'sponsorEmail', title: "Sponsor's Email" }
    ]
  });
  
  // แปลงข้อมูลให้ตรงกับ CSV format
  const csvData = credentials.map(cred => ({
    guestFirstName: cred.guestFirstName,
    guestLastName: cred.guestLastName,
    guestEmail: cred.guestEmail || '',
    guestPhone: cred.guestPhone || '',
    guestId: cred.guestId,
    password: cred.password,
    sponsorFirstName: cred.sponsorName || '',
    sponsorLastName: '',
    sponsorEmail: cred.sponsorEmail || ''
  }));
  
  // ลองเขียนไฟล์หลายครั้งถ้าไฟล์ถูก lock
  let retries = 3;
  let lastError = null;
  
  while (retries > 0) {
    try {
      await csvWriter.writeRecords(csvData);
      return filepath;
    } catch (error) {
      lastError = error;
      if (error.code === 'EBUSY' || error.message.includes('locked')) {
        retries--;
        if (retries > 0) {
          // รอ 500ms ก่อนลองใหม่
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      throw error;
    }
  }
  
  throw lastError;
}

// บันทึกไฟล์ PDF (รับ path ของ PDF ที่สร้างแล้ว)
async function savePDF(pdfBuffer) {
  await ensurePdfDir();
  const filename = getDateFilenameDisplay('pdf');
  const filepath = path.join(PDF_DIR, filename);
  await fs.writeFile(filepath, pdfBuffer);
  return filepath;
}

// ดึงไฟล์ PDF ล่าสุดจากโฟลเดอร์ Wi-Fi tricket
async function getLatestPdf() {
  await ensurePdfDir();
  const files = await fs.readdir(PDF_DIR);
  const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    return null;
  }

  const filesWithStats = await Promise.all(
    pdfFiles.map(async file => {
      const fullPath = path.join(PDF_DIR, file);
      const stats = await fs.stat(fullPath);
      return { file, fullPath, mtime: stats.mtime };
    })
  );

  filesWithStats.sort((a, b) => b.mtime - a.mtime);
  const latest = filesWithStats[0];

  return {
    filename: latest.file,
    path: latest.fullPath,
    modifiedAt: latest.mtime
  };
}

module.exports = {
  saveJSON,
  saveCSV,
  savePDF,
  getDateFilename,
  getDateFilenameDisplay,
  OUTPUT_DIR,
  PDF_DIR,
  getLatestPdf
};

