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
            // Fallback: SumatraPDF not found -> Use silent printing script
            console.log(`SumatraPDF not found. Using silent printing script...`);
            if (printerName) {
                console.log(`Target printer: ${printerName}`);
            } else {
                console.log(`Using default printer`);
            }
            
            // Use silent printing script
            const psScript = path.join(__dirname, 'print-silent.ps1');
            const safePrinterName = printerName || "";
            const command = `powershell -ExecutionPolicy Bypass -File "${psScript}" -FilePath "${filePath}" -PrinterName "${safePrinterName}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Print error: ${error.message}`);
                    return reject(error);
                }
                if (stdout) console.log(`PowerShell Output: ${stdout}`);
                if (stderr) console.warn(`PowerShell Warning: ${stderr}`);
                console.log('Print command executed successfully via silent printing script');
                resolve();
            });
        }
    });
}

module.exports = {
    printPDF
};
