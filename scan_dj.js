const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'public', 'plantillas', 'sii', 'DJ1948_AT_2025.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log('Rows 0-30:');
    for (let i = 0; i < Math.min(30, data.length); i++) {
        const row = data[i];
        const nonEmpty = row.filter(c => c).slice(0, 5);
        if (nonEmpty.length > 0) {
            console.log(`Row ${i}: ${JSON.stringify(nonEmpty)}`);
        }
    }

} catch (error) {
    console.error('Error:', error.message);
}
