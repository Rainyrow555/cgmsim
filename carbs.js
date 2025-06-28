const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');

// Load ISF and CR from environment variables
const ISF = parseFloat(process.env.ISF); // e.g., 50 mg/dL per unit
const CR = parseFloat(process.env.CR);   // e.g., 10g carbs per unit
console.log('ISF:', ISF, 'CR:', CR);

// Load sinusoidal curve data from JSON
const sinusDataPath = path.join(__dirname, 'files', 'sinuscurves.json');
const sinusData = JSON.parse(fs.readFileSync(sinusDataPath, 'utf-8'));
const sinus = sinusData.sinus;
const cosinus = sinusData.cosinus;

console.log('sinus:', sinus);
console.log('cosinus:', cosinus);

// Calculate constant liver glucose contribution (in mg/dL every 5 min)
// Liver produces ~10g carbs/hour → divide by 12 (5 min chunks) = ~0.833g every 5 min
// Convert carbs to BG using ISF/CR (BG rise per gram of carbs)
const liver = (ISF / CR) * (10 / 12);  // base BGI value every 5 minutes
const liver_sin = sinus.map(val => +(val * liver).toFixed(2)); // modulate with sinus curve

console.log('Base liver BGI per 5min:', liver.toFixed(2));
console.log('Sinus-modulated liver BGI:', liver_sin);

// Save result to ./files/latest_liver.json
const outputPath = path.join(__dirname, 'files', 'latest_liver.json');
fs.writeFileSync(outputPath, JSON.stringify(liver_sin, null, 4));

console.log('✅ Liver BGI (sinus-modulated) saved to', outputPath);
