/**
 * Card Template
 * สร้าง PDF สำหรับแสดง Wi-Fi credentials
 * Layout: 2 คอลัมน์, 10 แถว (10 ซ้าย 10 ขวา)
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function createPDF(credentials) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
    autoFirstPage: true,
    pdfVersion: '1.4' // รองรับการพิมพ์ที่ดีกว่า
  });
  
  // ตั้งค่า metadata ให้ PDF พร้อมปริ้น
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  doc.info = {
    Title: 'Wi-Fi Credentials',
    Author: 'TBK Group',
    Subject: 'Guest Wi-Fi Access Credentials',
    Keywords: 'Wi-Fi, Guest, Credentials',
    CreationDate: today,
    ModDate: today
  };
  
  // ตั้งค่าให้ PDF พร้อมพิมพ์ (Print-ready)
  // ใช้สีดำ-ขาวเพื่อให้พิมพ์ได้ชัดเจน
  doc.fillColor('black');
  
  const margin = { top: 45, bottom: 45, left: 40, right: 40 };
  doc.page.margins = margin;
  
  const pageWidth = doc.page.width - (margin.left + margin.right);
  const pageHeight = doc.page.height - (margin.top + margin.bottom);
  
  const columnGap = 8;
  const rowGap = 4;
  
  const cardWidth = (pageWidth - columnGap) / 2;
  const cardHeight = (pageHeight - (rowGap * 9)) / 10;
  
  const padding = 6;
  const lineWidth = 0.5; // ความหนาของเส้นแบ่ง
  
  // ตรวจสอบว่ามีไฟล์โลโก้หรือไม่ (รองรับ JPG, JPEG, PNG)
  // ลำดับการค้นหา: JPG ก่อน แล้วค่อย PNG
  const possibleLogos = [
    'logo.jpg',
    'logo.jpeg', 
    'tbk-logo.jpg',
    'tbk-group-logo.jpg',
    'tbk-logo.jpeg',
    'tbk-group-logo.jpeg',
    'logo.png',
    'tbk-group.png',  // เพิ่มชื่อไฟล์ที่ผู้ใช้เพิ่มมา
    'tbk-logo.png',
    'tbk-group-logo.png'
  ];
  
  let logoFile = null;
  let logoBuffer = null;
  
  for (const logo of possibleLogos) {
    const testPath = path.join(__dirname, '..', 'assets', logo);
    if (fs.existsSync(testPath)) {
      logoFile = testPath;
      console.log(`Found logo file: ${logoFile}`);
      try {
        // อ่านไฟล์โลโก้เป็น buffer
        logoBuffer = fs.readFileSync(testPath);
        console.log(`Logo file loaded successfully, size: ${logoBuffer.length} bytes`);
      } catch (error) {
        console.error(`Error reading logo file: ${error.message}`);
        logoFile = null;
        logoBuffer = null;
      }
      break;
    }
  }
  
  if (!logoFile || !logoBuffer) {
    console.log('No logo file found or could not read logo file in assets folder');
  } else {
    console.log(`Logo will be used: ${logoFile}, Buffer size: ${logoBuffer.length} bytes`);
  }
  
  // แบ่ง credentials เป็น 2 กลุ่ม (ซ้าย 10, ขวา 10)
  const leftCredentials = credentials.slice(0, 10);
  const rightCredentials = credentials.slice(10, 20);
  
  // วาดเส้นแบ่งแนวตั้งระหว่าง 2 คอลัมน์
  const verticalLineX = margin.left + cardWidth;
  doc.moveTo(verticalLineX, margin.top)
     .lineTo(verticalLineX, margin.top + (cardHeight * 10) + (rowGap * 9))
     .strokeColor('#000000')
     .lineWidth(lineWidth)
     .stroke();
  
  // สร้าง cards สำหรับคอลัมน์ซ้าย
  leftCredentials.forEach((cred, index) => {
    const x = margin.left; // left margin
    const y = margin.top + (index * (cardHeight + rowGap));
    
    // วาดเส้นแบ่งแนวนอนระหว่างแถว (ยกเว้นแถวแรก)
    if (index > 0) {
      const lineY = y;
      doc.moveTo(x, lineY)
         .lineTo(x + cardWidth, lineY)
         .strokeColor('#000000')
         .lineWidth(lineWidth)
         .stroke();
    }
    
    // วาดกรอบสี่เหลี่ยมให้ card
    doc.rect(x, y, cardWidth, cardHeight)
       .strokeColor('#000000')
       .lineWidth(lineWidth)
       .stroke();
    
    // Logo (TBK Group) - ด้านบนซ้าย
    let logoHeight = 15; // default height ถ้าไม่มีโลโก้
    if (logoFile && logoBuffer) {
      // ใช้รูปภาพโลโก้จาก path (pdfkit ทำงานได้ดีกว่ากับ path)
      try {
        // ปรับขนาดโลโก้ให้เหมาะสม (ลดขนาดลงเล็กน้อยเพื่อให้พอดีกับหน้าเดียว)
        const logoWidth = 50;
        const logoHeightValue = 16;
        // ใช้ path แทน buffer เพื่อให้ pdfkit โหลดได้ดีกว่า
        doc.image(logoFile, x + padding, y + padding, {
          width: logoWidth,
          height: logoHeightValue
        });
        logoHeight = logoHeightValue + 3; // เพิ่มระยะห่างเล็กน้อย
      } catch (error) {
        console.error(`Error loading logo from path: ${error.message}`);
        // ถ้าใช้ path ไม่ได้ ลองใช้ buffer
        try {
          doc.image(logoBuffer, x + padding, y + padding, {
            width: 50,
            height: 16
          });
          logoHeight = 21;
        } catch (bufferError) {
          console.error(`Error loading logo from buffer: ${bufferError.message}`);
          // ถ้าไม่สามารถโหลดรูปได้ ให้ใช้ข้อความแทน
          doc.fontSize(11)
             .fillColor('#000000')
             .text('TBK Group', x + padding, y + padding, {
               width: cardWidth - (padding * 2)
             });
          logoHeight = 15;
        }
      }
    } else {
      // ถ้าไม่มีไฟล์โลโก้ ให้ใช้ข้อความ
      doc.fontSize(11)
         .fillColor('#000000')
         .text('TBK Group', x + padding, y + padding, {
           width: cardWidth - (padding * 2)
         });
    }
    
    // SSID (ปรับตำแหน่งให้อยู่ใต้โลโก้)
    doc.fontSize(8)
       .text(`SSID: ${cred.ssid}`, x + padding, y + padding + logoHeight, {
         width: cardWidth - (padding * 2)
       });
    
    // Username
    doc.fontSize(8)
       .text(`Username: ${cred.guestId}`, x + padding, y + padding + logoHeight + 10, {
         width: cardWidth - (padding * 2)
       });
    
    // Password
    doc.fontSize(8)
       .text(`Password: ${cred.password}`, x + padding, y + padding + logoHeight + 20, {
         width: cardWidth - (padding * 2)
       });
    
    // Expiration Date - ด้านล่างขวา
    const expText = `Exp: ${cred.expiration}`;
    doc.fontSize(8);
    const expWidth = doc.widthOfString(expText);
    doc.text(expText, x + cardWidth - padding - expWidth, y + cardHeight - padding - 6);
  });
  
  // สร้าง cards สำหรับคอลัมน์ขวา
  rightCredentials.forEach((cred, index) => {
    const x = margin.left + cardWidth + columnGap; // left margin + card width + gap
    const y = margin.top + (index * (cardHeight + rowGap));
    
    // วาดเส้นแบ่งแนวนอนระหว่างแถว (ยกเว้นแถวแรก)
    if (index > 0) {
      const lineY = y;
      doc.moveTo(x, lineY)
         .lineTo(x + cardWidth, lineY)
         .strokeColor('#000000')
         .lineWidth(lineWidth)
         .stroke();
    }
    
    // วาดกรอบสี่เหลี่ยมให้ card
    doc.rect(x, y, cardWidth, cardHeight)
       .strokeColor('#000000')
       .lineWidth(lineWidth)
       .stroke();
    
    // Logo (TBK Group) - ด้านบนซ้าย
    let logoHeight = 15; // default height ถ้าไม่มีโลโก้
    if (logoFile && logoBuffer) {
      // ใช้รูปภาพโลโก้จาก path (pdfkit ทำงานได้ดีกว่ากับ path)
      try {
        // ปรับขนาดโลโก้ให้เหมาะสม (ลดขนาดลงเล็กน้อยเพื่อให้พอดีกับหน้าเดียว)
        const logoWidth = 50;
        const logoHeightValue = 16;
        // ใช้ path แทน buffer เพื่อให้ pdfkit โหลดได้ดีกว่า
        doc.image(logoFile, x + padding, y + padding, {
          width: logoWidth,
          height: logoHeightValue
        });
        logoHeight = logoHeightValue + 3; // เพิ่มระยะห่างเล็กน้อย
      } catch (error) {
        console.error(`Error loading logo from path: ${error.message}`);
        // ถ้าใช้ path ไม่ได้ ลองใช้ buffer
        try {
          doc.image(logoBuffer, x + padding, y + padding, {
            width: 50,
            height: 16
          });
          logoHeight = 21;
        } catch (bufferError) {
          console.error(`Error loading logo from buffer: ${bufferError.message}`);
          // ถ้าไม่สามารถโหลดรูปได้ ให้ใช้ข้อความแทน
          doc.fontSize(11)
             .fillColor('#000000')
             .text('TBK Group', x + padding, y + padding, {
               width: cardWidth - (padding * 2)
             });
          logoHeight = 15;
        }
      }
    } else {
      // ถ้าไม่มีไฟล์โลโก้ ให้ใช้ข้อความ
      doc.fontSize(11)
         .fillColor('#000000')
         .text('TBK Group', x + padding, y + padding, {
           width: cardWidth - (padding * 2)
         });
    }
    
    // SSID (ปรับตำแหน่งให้อยู่ใต้โลโก้)
    doc.fontSize(8)
       .text(`SSID: ${cred.ssid}`, x + padding, y + padding + logoHeight, {
         width: cardWidth - (padding * 2)
       });
    
    // Username
    doc.fontSize(8)
       .text(`Username: ${cred.guestId}`, x + padding, y + padding + logoHeight + 10, {
         width: cardWidth - (padding * 2)
       });
    
    // Password
    doc.fontSize(8)
       .text(`Password: ${cred.password}`, x + padding, y + padding + logoHeight + 20, {
         width: cardWidth - (padding * 2)
       });
    
    // Expiration Date - ด้านล่างขวา
    const expText = `Exp: ${cred.expiration}`;
    doc.fontSize(8);
    const expWidth = doc.widthOfString(expText);
    doc.text(expText, x + cardWidth - padding - expWidth, y + cardHeight - padding - 6);
  });
  
  return doc;
}

module.exports = {
  createPDF
};

