/**
 * Express Server
 * API endpoint สำหรับ generate Wi-Fi credentials
 */

const express = require('express');
const { generateCredentials } = require('./generators/wifiGenerator');
const fs = require('fs').promises;
const { saveJSON, saveCSV, savePDF, getDateFilenameDisplay, getLatestPdf } = require('./utils/fileManager');

const { createPDF } = require('./templates/cardTemplate');
const { printPDF } = require('./utils/printManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API Endpoint: Generate Wi-Fi Credentials
app.get('/api/generate', async (req, res) => {
  try {
    // Generate credentials
    const credentials = generateCredentials(20);

    // บันทึกไฟล์ JSON
    await saveJSON(credentials);

    // บันทึกไฟล์ CSV (ถ้า fail ก็ยังทำงานต่อได้)
    try {
      await saveCSV(credentials);
    } catch (csvError) {
      console.error('Warning: Failed to save CSV file:', csvError.message);
      // ยังทำงานต่อได้ ไม่ throw error
    }

    // สร้าง PDF
    const pdfDoc = createPDF(credentials);
    const pdfChunks = [];

    pdfDoc.on('data', (chunk) => {
      pdfChunks.push(chunk);
    });

    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(pdfChunks);

      // บันทึกไฟล์ PDF
      const pdfPath = await savePDF(pdfBuffer);

      // Check for print query parameter
      if (req.query.print === 'true') {
        const printerName = req.query.printer;
        console.log(`Auto-printing requested via query param... (Printer: ${printerName || 'Default'})`);
        printPDF(pdfPath, printerName).catch(err => console.error('Auto-print failed:', err));
      }

      // ส่งคืน PDF
      const pdfFilename = getDateFilenameDisplay('pdf');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
      res.send(pdfBuffer);
    });

    pdfDoc.end();

  } catch (error) {
    console.error('Error generating credentials:', error);
    res.status(500).json({
      error: 'Failed to generate credentials',
      message: error.message
    });
  }
});

// POST endpoint (รองรับทั้ง GET และ POST)
app.post('/api/generate', async (req, res) => {
  try {
    // Generate credentials
    const credentials = generateCredentials(20);

    // บันทึกไฟล์ JSON
    await saveJSON(credentials);

    // บันทึกไฟล์ CSV (ถ้า fail ก็ยังทำงานต่อได้)
    try {
      await saveCSV(credentials);
    } catch (csvError) {
      console.error('Warning: Failed to save CSV file:', csvError.message);
      // ยังทำงานต่อได้ ไม่ throw error
    }

    // สร้าง PDF
    const pdfDoc = createPDF(credentials);
    const pdfChunks = [];

    pdfDoc.on('data', (chunk) => {
      pdfChunks.push(chunk);
    });

    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(pdfChunks);

      // บันทึกไฟล์ PDF
      const pdfPath = await savePDF(pdfBuffer);

      // Check for print query parameter
      if (req.query.print === 'true') {
        const printerName = req.query.printer;
        console.log(`Auto-printing requested via query param... (Printer: ${printerName || 'Default'})`);
        printPDF(pdfPath, printerName).catch(err => console.error('Auto-print failed:', err));
      }

      // ส่งคืน PDF
      const pdfFilename = getDateFilenameDisplay('pdf');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
      res.send(pdfBuffer);
    });

    pdfDoc.end();

  } catch (error) {
    console.error('Error generating credentials:', error);
    res.status(500).json({
      error: 'Failed to generate credentials',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Wi-Fi Credential Generator API is running' });
});

// Print endpoint - ส่ง PDF พร้อม auto-print
app.get('/api/generate/print', async (req, res) => {
  try {
    // Generate credentials
    const credentials = generateCredentials(20);

    // บันทึกไฟล์ JSON
    await saveJSON(credentials);

    // บันทึกไฟล์ CSV (ถ้า fail ก็ยังทำงานต่อได้)
    try {
      await saveCSV(credentials);
    } catch (csvError) {
      console.error('Warning: Failed to save CSV file:', csvError.message);
    }

    // สร้าง PDF
    const pdfDoc = createPDF(credentials);
    const pdfChunks = [];

    pdfDoc.on('data', (chunk) => {
      pdfChunks.push(chunk);
    });

    pdfDoc.on('end', async () => {
      const pdfBuffer = Buffer.concat(pdfChunks);

      // บันทึกไฟล์ PDF
      await savePDF(pdfBuffer);

      // แปลง PDF เป็น base64 สำหรับ embed ใน HTML
      const pdfBase64 = pdfBuffer.toString('base64');
      const pdfFilename = getDateFilenameDisplay('pdf');

      // สร้าง HTML page พร้อม auto-print
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Wi-Fi Credentials - Auto Print</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <iframe id="pdfFrame" src="data:application/pdf;base64,${pdfBase64}"></iframe>
  <script>
    // Auto print เมื่อ PDF โหลดเสร็จ
    window.onload = function() {
      setTimeout(function() {
        var iframe = document.getElementById('pdfFrame');
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 500);
    };
    
    // Fallback: ถ้า iframe print ไม่ได้ ให้ใช้ window.print()
    setTimeout(function() {
      window.print();
    }, 1000);
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });

    pdfDoc.end();

  } catch (error) {
    console.error('Error generating credentials:', error);
    res.status(500).json({
      error: 'Failed to generate credentials',
      message: error.message
    });
  }
});

// Endpoint สำหรับพิมพ์ไฟล์ล่าสุดที่ถูกสร้างไว้
app.get('/print/latest', async (req, res) => {
  try {
    const latest = await getLatestPdf();
    if (!latest) {
      res.status(404).send('<h1>No PDF found</h1><p>Please generate a Wi-Fi ticket first.</p>');
      return;
    }

    const pdfBuffer = await fs.readFile(latest.path);
    const pdfBase64 = pdfBuffer.toString('base64');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Wi-Fi Credentials - Auto Print</title>
  <style>
    @media print {
      @page { size: A4; margin: 0; }
      html, body {
        width: 210mm;
        height: 297mm;
      }
      iframe {
        width: 210mm;
        height: 297mm;
        border: none;
      }
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    }
    header {
      padding: 12px 18px;
      background: #111827;
      color: #fff;
      font-size: 14px;
    }
    iframe {
      width: 100%;
      height: calc(100vh - 48px);
      border: none;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <header>
    Latest Wi-Fi ticket: ${latest.filename} (updated: ${latest.modifiedAt.toLocaleString()})
  </header>
  <iframe id="pdfFrame" src="data:application/pdf;base64,${pdfBase64}"></iframe>
  <script>
    const triggerPrint = () => {
      try {
        const iframe = document.getElementById('pdfFrame');
        if (!iframe || !iframe.contentWindow) {
          window.print();
          return;
        }
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print trigger failed', err);
        window.print();
      }
    };

    window.addEventListener('load', () => {
      setTimeout(triggerPrint, 700);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error serving latest PDF for print:', error);
    res.status(500).send('<h1>Failed to load latest PDF</h1><p>Please check the server logs for more details.</p>');
  }
});

// New Endpoint: Trigger print for latest PDF (Server-side print)
app.post('/api/print/latest', async (req, res) => {
  try {
    const latest = await getLatestPdf();
    if (!latest) {
      return res.status(404).json({ error: 'No PDF found to print' });
    }

    const printerName = req.body.printer || req.query.printer;
    console.log(`Printing latest PDF: ${latest.filename} (Printer: ${printerName || 'Default'})`);
    await printPDF(latest.path, printerName);

    res.json({
      status: 'ok',
      message: 'Print command sent successfully',
      file: latest.filename
    });
  } catch (error) {
    console.error('Error printing latest PDF:', error);
    res.status(500).json({
      error: 'Failed to print PDF',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wi-Fi Credential Generator API is running on port ${PORT}`);
  console.log(`Access the API at: http://localhost:${PORT}/api/generate`);
  console.log(`Network access: http://0.0.0.0:${PORT}/api/generate`);
  console.log(`For Docker containers, use: http://host.docker.internal:${PORT}/api/generate`);
});

module.exports = app;

