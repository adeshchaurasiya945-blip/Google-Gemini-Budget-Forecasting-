import { Transaction } from '../context/AppContext';

export function parseCsvData(csv: string): Transaction[] {
  const lines = csv.split('\n');
  const transactions: Transaction[] = [];
  
  const months = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02'];
  const years = ['2025', '2025', '2025', '2025', '2025', '2025', '2025', '2025', '2025', '2026', '2026'];
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,,')) continue;
    
    let inQuotes = false;
    let currentField = '';
    const fields = [];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    if (fields.length < 3) continue;

    const department = fields[0];
    const head = fields[1];
    const subHead = fields[2];
    
    if (!department) continue;
    
    for (let m = 0; m < 11; m++) {
      const valStr = fields[3 + m];
      if (!valStr || valStr === '-' || valStr === '') continue;
      
      const actual = parseFloat(valStr.replace(/,/g, ''));
      if (isNaN(actual) || actual === 0) continue;
      
      const forecast = actual * 1.1; 
      
      transactions.push({
        id: `tx-${i}-${m}-${Math.random().toString(36).substr(2, 9)}`,
        date: `${years[m]}-${months[m]}-01`,
        department,
        head,
        subHead,
        actual,
        forecast
      });
    }
  }
  return transactions;
}
