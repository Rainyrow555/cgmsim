const dotenv = require('dotenv');
dotenv.config();

const ISF = parseFloat(process.env.ISF);
const CR = parseFloat(process.env.CR);

if (!ISF || !CR) {
  console.error('Error: ISF and CR environment variables must be set and valid numbers!');
  process.exit(1);
}

const sinusdata = require('./files/sinuscurves.json');
const sinus = sinusdata.sinus;

const now = new Date();
const hour = now.getHours(); // 0-23

if (!Array.isArray(sinus) || sinus.length !== 24) {
  console.error('Error: sinus data must be an array of 24 values!');
  process.exit(1);
}

// Calculate liver glucose infusion per 5-min interval
const liver = (ISF / CR) * (10 / 12); // 10g/h over 5-min intervals (12 intervals per hour)
const liver_sin = liver * sinus[hour];

console.log('Base liver glucose infusion:', liver.toFixed(4));
console.log(`Liver glucose infusion at hour ${hour}:`, liver_sin.toFixed(4));

const fs = require('fs');
fs.writeFile("./files/latest_liver.json", JSON.stringify(liver_sin), function(err) {
  if (err) {
    console.error('Error writing latest_liver.json:', err);
  } else {
    console.log('Successfully wrote latest_liver.json');
  }
});
