const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'public', 'plantillas', 'sii', 'DJ1948_AT_2025.xlsx');
console.log('Reading:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row
    let headerRow = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (row.some(cell => cell && cell.toString().trim() === 'C1')) {
            headerRow = i;
            break;
        }
    }

    if (headerRow >= 0) {
        console.log('\\nHeader row:', headerRow);
        console.log('\\nColumns:');
        data[headerRow].forEach((cell, i) => {
            if (cell) console.log(`  [${i}] ${cell}`);
        });

        console.log('\\nFirst data row:');
        if (data[headerRow + 1]) {
            data[headerRow + 1].forEach((cell, i) => {
                if (cell) console.log(`  [${i}] ${cell}`);
            });
        }
    } else {
        console.log('Header not found in first 20 rows');
    }

} catch (error) {
    console.error('Error:', error.message);
}
