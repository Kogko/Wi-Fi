const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Default path for SumatraPDF
const SUMATRA_PATH = 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe';

/**
 * Print a PDF file using the best available method.
 * Tries SumatraPDF first (silent print), then falls back to Windows 'print' verb.
 * 
 * @param {string} filePath - Absolute path to the PDF file
 * @param {string} [printerName] - Optional specific printer name
 * @returns {Promise<void>}
 */
function printPDF(filePath, printerName = null) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        // Check if SumatraPDF exists
        const useSumatra = fs.existsSync(SUMATRA_PATH);

        if (useSumatra) {
            let command = `"${SUMATRA_PATH}" -print-to-default -silent "${filePath}"`;

            if (printerName) {
                command = `"${SUMATRA_PATH}" -print-to "${printerName}" -silent "${filePath}"`;
            }

            console.log(`Printing with SumatraPDF: ${command}`);

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`SumatraPDF error: ${error.message}`);
                    return reject(error);
                }
                if (stderr) {
                    console.warn(`SumatraPDF stderr: ${stderr}`);
                }
                console.log('Print command sent successfully via SumatraPDF');
                resolve();
            });
        } else {
            // Fallback: SumatraPDF not found -> Use Start-Process -Verb Print
            console.log(`SumatraPDF not found. Using Windows default print method...`);
            if (printerName) {
                console.log(`Target printer: ${printerName}`);
                // ถ้ามี printer name ต้องใช้ PowerShell script เพื่อเปลี่ยน default printer
                const psScript = path.join(__dirname, 'print-with-default-switch.ps1');
                const safePrinterName = printerName || "";
                const command = `powershell -ExecutionPolicy Bypass -File "${psScript}" -FilePath "${filePath}" -PrinterName "${safePrinterName}"`;

                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Print error: ${error.message}`);
                        return reject(error);
                    }
                    if (stdout) console.log(`PowerShell Output: ${stdout}`);
                    console.log('Print command executed successfully via PowerShell');
                    resolve();
                });
            } else {
                // ถ้าไม่มี printer name ใช้ Start-Process -Verb Print โดยตรง
                const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print"`;
                console.log(`Executing: ${command}`);
                
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Print error: ${error.message}`);
                        return reject(error);
                    }
                    if (stdout) console.log(`PowerShell Output: ${stdout}`);
                    console.log('Print command executed successfully via Start-Process');
                    resolve();
                });
            }
        }
    });
}

module.exports = {
    printPDF
};
