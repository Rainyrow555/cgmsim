const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Load SGV starting point
const sgvData = JSON.parse(fs.readFileSync(path.join(__dirname, 'files', 'sgv_start.json'), 'utf-8'));
let bg = sgvData.start; // in mg/dL

// Load exercise & step data
const exercise = JSON.parse(fs.readFileSync(path.join(__dirname, 'files', 'exercise.json'), 'utf-8'));
const steps = JSON.parse(fs.readFileSync(path.join(__dirname, 'files', 'steps.json'), 'utf-8'));

// Constants
const baseISF = 50; // base insulin sensitivity factor (mg/dL per U)
let activeISF = baseISF;
const hourlyCarbImpact = 10; // g/hr from liver
const CR = 10; // carbs covered by 1U

// Time now
const now = Date.now();
const hour = moment(now).hour();

// Detect if recent exercise or high steps (within 1 hour)
let recentExercise = exercise.some(act => now - act.time < 60 * 60 * 1000);
let recentSteps = steps.some(s => s.steps > 500 && now - s.time < 60 * 60 * 1000);
let sleeping = hour >= 0 && hour < 6;

// Adjust ISF
if (recentExercise || recentSteps) {
    activeISF *= 1.3; // more sensitive to insulin
} else if (sleeping) {
    activeISF *= 0.8; // less sensitive
}

console.log(`BG start: ${bg} mg/dL`);
console.log(`Mode: ${recentExercise ? 'Exercise' : sleeping ? 'Sleep' : 'Normal'}`);

// Simulate liver glucose over next hour (12 intervals of 5 min)
let glucoseCurve = [];
for (let i = 0; i < 12; i++) {
    let carbs = hourlyCarbImpact / 12; // about 0.83g carbs every 5min
    let bgRise = (activeISF / CR) * carbs;
    bg += bgRise;
    glucoseCurve.push(Math.round(bg));
}

console.log('Simulated BG (1 hour):', glucoseCurve);

// Write updated curve to file
fs.writeFileSync(
    path.join(__dirname, 'files', 'simulated_bg_curve.json'),
    JSON.stringify(glucoseCurve, null, 4)
);

console.log('✅ Simulated BG curve saved to ./files/simulated_bg_curve.json');
