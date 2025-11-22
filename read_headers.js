const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'public', 'plantillas', 'sii', 'DJ1948_AT_2025.XLSX');
console.log('Reading file:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const XLSX = require('xlsx');
    const path = require('path');

    const filePath = path.join(process.cwd(), 'public', 'plantillas', 'sii', 'DJ1948_AT_2025.XLSX');
    console.log('Reading file:', filePath);

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get range
        const range = XLSX.utils.decode_range(sheet['!ref']);

        console.log('Scanning for headers...');
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });

        const headerRowIndex = data.findIndex(row => row.some(cell => cell && (cell.toString().trim() === 'C1' || cell.toString().includes('C1'))));

        if (headerRowIndex !== -1) {
            console.log(`Header found at row ${headerRowIndex}`);
            const headerRow = data[headerRowIndex];
            headerRow.forEach((cell, i) => {
                console.log(`Column ${i}: ${cell}`);
            });
        } else {
            console.log('Header "C1" not found.');
            // Print first non-empty row
            const firstRow = data.find(row => row.some(c => c));
            console.log('First non-empty row:', JSON.stringify(firstRow));
        }
    }

} catch (error) {
    console.error('Error reading file:', error.message);
}
