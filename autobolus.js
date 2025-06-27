const fetch = require('node-fetch');
const dotenv = require('dotenv').config();
const fs = require('fs');
const moment = require('moment');

// Data imports
const sgv = require('./files/sgv.json');
const profile = require('./files/profile.json');
const iobHistory = require('./files/iobHistory.json');  // ← add this JSON to track boluses
const activity = require('./files/exercise.json');      // ← stores recent workouts

const api_url = process.env.API_URL_TEST;
const api_key = process.env.API_KEY;

const NOW = Date.now();
const BG = sgv[0].sgv / 18;
const TREND = sgv[0].direction || 'Flat';

// 1. Get latest AutoSync profile
const recentProfiles = profile.filter(p => p.mills >= (NOW - 86400000));
const autoSyncProfile = recentProfiles.map(p => p.store?.['OpenAPS Autosync'])[0];
if (!autoSyncProfile) {
  console.error('🚫 No AutoSync profile found.');
  process.exit(1);
}

// 2. Get ISF, CR, and Target from profile
let sens = autoSyncProfile.sens[0].value;
let cr = autoSyncProfile.carbratio[0].value;
const target = autoSyncProfile.target_high[0].value;

// 3. Exercise sensitivity boost (within 2h of exercise or during it)
const recentWorkout = activity.find(e => NOW - e.time < 2 * 60 * 60 * 1000);
if (recentWorkout) {
  console.log('🏃‍♀️ Exercise detected. Boosting sensitivity.');
  sens = sens * 1.3; // Increase sensitivity = lower correction dose
}

// 4. IOB check — cap insulin in past hour to 1.5U
const iobWindow = iobHistory.filter(e => (NOW - e.time < 60 * 60 * 1000));
const iobTotal = iobWindow.reduce((sum, b) => sum + b.insulin, 0);
const iobCap = 1.5;
if (iobTotal >= iobCap) {
  console.log(`🛑 IOB cap hit: ${iobTotal.toFixed(2)}U in last hour. No microbolus given.`);
  return;
}

// 5. Microbolus logic
const delta = BG - target;
if (delta > 0.5 && !TREND.includes('Down')) {
  let microDose = Math.min(0.3, Math.max(0.05, delta / sens));
  
  // Adjust for remaining IOB cap
  const remainingCap = iobCap - iobTotal;
  if (microDose > remainingCap) microDose = remainingCap;

  const roundedDose = Math.round(microDose * 100) / 100;

  const bolus = {
    time: NOW,
    insulin: roundedDose,
    eventType: 'Auto Correction',
    created_at: moment(NOW).toISOString(),
    dateString: moment(NOW).toISOString(),
    secret: api_key
  };

  fetch(api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bolus)
  })
  .then(res => {
    if (res.ok) {
      console.log(`✅ AutoBolus ${roundedDose}U sent. BG: ${BG.toFixed(1)} mmol/L, Sens: ${sens.toFixed(2)}.`);
      // Save to IOB history file
      iobHistory.push({ time: NOW, insulin: roundedDose });
      fs.writeFileSync('./files/iobHistory.json', JSON.stringify(iobHistory.slice(-50), null, 2));
    } else {
      console.error(`❌ Bolus failed. Status: ${res.status}`);
    }
  })
  .catch(err => console.error('⚠️ Fetch error:', err));

} else {
  console.log(`🟡 No bolus: BG=${BG.toFixed(1)}, Δ=${delta.toFixed(2)}, Trend=${TREND}`);
}
