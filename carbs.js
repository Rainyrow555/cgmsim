// files/carbs.js

/**
 * Carb absorption model — simulates how carbs enter the bloodstream
 * over 180 minutes using a Gaussian distribution (peaks at 60 min).
 */

const TOTAL_ABSORPTION_MINUTES = 180;

function gaussian(x, mean, sigma) {
  return Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
}

/**
 * Returns carbs absorbed at a specific minute since the meal started.
 * @param {number} totalCarbs - Total grams of carbs eaten
 * @param {number} minutesSinceMeal - Minutes passed since the meal began
 * @returns {number} - grams of carbs absorbed at that minute
 */
function carbAbsorption(totalCarbs, minutesSinceMeal) {
  if (minutesSinceMeal < 0 || minutesSinceMeal > TOTAL_ABSORPTION_MINUTES) {
    return 0;
  }

  const peakTime = 60;
  const stdDev = 30;

  // Normalize the curve
  let normalization = 0;
  for (let t = 0; t <= TOTAL_ABSORPTION_MINUTES; t++) {
    normalization += gaussian(t, peakTime, stdDev);
  }

  const proportion = gaussian(minutesSinceMeal, peakTime, stdDev) / normalization;
  return totalCarbs * proportion;
}

// ⏱️ Optional: run a test simulation
function simulate(totalCarbs) {
  console.log(`\n📊 Absorption curve for ${totalCarbs}g carbs\n`);
  for (let t = 0; t <= TOTAL_ABSORPTION_MINUTES; t += 10) {
    const absorbed = carbAbsorption(totalCarbs, t);
    console.log(`Minute ${t}: ${absorbed.toFixed(2)}g`);
  }
}

// Export the function so you can use it elsewhere
module.exports = {
  carbAbsorption,
  simulate,
};

// To test it manually, uncomment:
// simulate(50);
