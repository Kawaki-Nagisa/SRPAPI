// server.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

// const MONTHLY_CONSUMPTION_WEIGHTS = {
//   January: 7.13,
//   February: 6.19,
//   March: 5.35,
//   April: 5.48,
//   May: 7.15,
//   June: 10.09,
//   July: 14.13,
//   August: 14.17,
//   September: 11.62,
//   October: 8.43,
//   November: 4.74,
//   December: 5.52
// };

// const MONTHLY_SOLAR_PERCENTAGES = {
//   January: 7.31,
//   February: 10.90,
//   March: 12.23,
//   April: 13.22,
//   May: 13.67,
//   June: 15.23,
//   July: 15.11,
//   August: 14.15,
//   September: 10.80,
//   October: 6.93,
//   November: 5.01,
//   December: 4.46
// };

const PEAK_SOLAR_FACTORS = {
  January: 0.0443,
  February: 0.0679,
  March: 0.0988,
  April: 0.1315,
  May: 0.3555,
  June: 0.3636,
  July: 0.3654,
  August: 0.3609,
  September: 0.3311,
  October: 0.2982,
  November: 0.0656,
  December: 0.0511
};

const SEASONS = {
  WINTER: ['January', 'February', 'March', 'April', 'November', 'December'],
  SUMMER: ['May', 'June', 'September', 'October'],
  SUMMER_PEAK: ['July', 'August']
};

const RATES = {
  WINTER: {
    onPeak: 0.0674,   // 5am-9am & 5pm-9pm
    offPeak: 0.0634
  },
  SUMMER: {
    onPeak: 0.0663,   // 2pm-8pm
    offPeak: 0.0561
  },
  SUMMER_PEAK: {
    onPeak: 0.0823,   // 2pm-8pm
    offPeak: 0.0613
  }
};

const DEMAND_CHARGES = {
  WINTER: [
    { limit: 3, rate: 3.49 },
    { limit: 10, rate: 5.58 },
    { limit: Infinity, rate: 9.57 }
  ],
  SUMMER: [
    { limit: 3, rate: 7.89 },
    { limit: 10, rate: 14.37 },
    { limit: Infinity, rate: 27.28 }
  ],
  SUMMER_PEAK: [
    { limit: 3, rate: 9.43 },
    { limit: 10, rate: 17.51 },
    { limit: Infinity, rate: 33.59 }
  ]
};

const DEMAND_MATRIX = {
  SUMMER: [
    { yearly: 15000, noBattery: 6, values: [3, 1, 0, 0, 0, 0, 0, 0, 0] },
    { yearly: 18000, noBattery: 7, values: [4, 2, 1, 0, 0, 0, 0, 0, 0] },
    { yearly: 21000, noBattery: 8, values: [5, 3, 2, 1, 0, 0, 0, 0, 0] },
    { yearly: 24000, noBattery: 9, values: [6, 4, 2, 1, 0, 0, 0, 0, 0] },
    { yearly: 27000, noBattery: 10, values: [7, 5, 3, 2, 1, 0, 0, 0, 0] },
    { yearly: 30000, noBattery: 11, values: [8, 6, 4, 3, 2, 1, 0, 0, 0] },
    { yearly: 33000, noBattery: 12, values: [9, 7, 5, 4, 3, 2, 1, 0, 0] },
    { yearly: 36000, noBattery: 13, values: [10, 8, 6, 5, 4, 3, 2, 1, 0] },
    { yearly: 39000, noBattery: 14, values: [11, 9, 7, 6, 5, 4, 3, 2, 1] },
    { yearly: 42000, noBattery: 15, values: [12, 10, 8, 7, 6, 5, 4, 3, 2] },
    { yearly: 45000, noBattery: 16, values: [13, 11, 9, 8, 7, 6, 5, 4, 3] },
    { yearly: 48000, noBattery: 17, values: [14, 12, 10, 9, 8, 7, 6, 5, 4] },
    { yearly: 51000, noBattery: 18, values: [15, 13, 11, 10, 9, 8, 7, 6, 5] }
  ],
  SUMMER_PEAK: [
    { yearly: 15000, noBattery: 8, values: [5, 2, 1, 1, 1, 1, 1, 1, 1] },
    { yearly: 18000, noBattery: 9, values: [6, 3, 2, 1, 1, 1, 1, 1, 1] },
    { yearly: 21000, noBattery: 10, values: [7, 4, 3, 2, 1, 1, 1, 1, 1] },
    { yearly: 24000, noBattery: 11, values: [8, 5, 4, 3, 2, 1, 1, 1, 1] },
    { yearly: 27000, noBattery: 12, values: [9, 6, 5, 4, 3, 2, 1, 1, 1] },
    { yearly: 30000, noBattery: 13, values: [10, 7, 6, 5, 4, 3, 2, 1, 1] },
    { yearly: 33000, noBattery: 14, values: [11, 8, 7, 6, 5, 4, 3, 2, 1] },
    { yearly: 36000, noBattery: 15, values: [12, 9, 8, 7, 6, 5, 4, 3, 2] },
    { yearly: 39000, noBattery: 16, values: [13, 10, 9, 8, 7, 6, 5, 4, 3] },
    { yearly: 42000, noBattery: 17, values: [14, 11, 10, 9, 8, 7, 6, 5, 4] },
    { yearly: 45000, noBattery: 18, values: [15, 12, 11, 10, 9, 8, 7, 6, 5] },
    { yearly: 48000, noBattery: 19, values: [16, 13, 12, 11, 10, 9, 8, 7, 6] },
    { yearly: 51000, noBattery: 19, values: [16, 14, 13, 12, 11, 10, 9, 8, 7] }
  ],
  WINTER: [
    { yearly: 15000, noBattery: 3, values: [1, 0, 0, 0, 0, 0, 0, 0, 0] },
    { yearly: 18000, noBattery: 4, values: [2, 1, 0, 0, 0, 0, 0, 0, 0] },
    { yearly: 21000, noBattery: 5, values: [3, 1, 0, 0, 0, 0, 0, 0, 0] },
    { yearly: 24000, noBattery: 6, values: [4, 2, 1, 0, 0, 0, 0, 0, 0] },
    { yearly: 27000, noBattery: 7, values: [5, 3, 1, 0, 0, 0, 0, 0, 0] },
    { yearly: 30000, noBattery: 8, values: [6, 4, 2, 1, 0, 0, 0, 0, 0] },
    { yearly: 33000, noBattery: 9, values: [7, 5, 3, 2, 1, 0, 0, 0, 0] },
    { yearly: 36000, noBattery: 11, values: [8, 6, 4, 3, 2, 1, 0, 0, 0] },
    { yearly: 39000, noBattery: 12, values: [9, 7, 5, 4, 3, 2, 1, 0, 0] },
    { yearly: 42000, noBattery: 13, values: [10, 8, 6, 5, 4, 3, 2, 1, 0] },
    { yearly: 45000, noBattery: 14, values: [11, 9, 7, 6, 5, 4, 3, 2, 1] },
    { yearly: 48000, noBattery: 16, values: [12, 10, 8, 7, 6, 5, 4, 3, 2] },
    { yearly: 51000, noBattery: 16, values: [13, 11, 9, 8, 7, 6, 5, 4, 3] }
  ]
};


function getDemandValue(totalConsumption, batteryCapacity, season) {
  // Map battery capacities to their column index
  const batteryCapacityMapping = [5, 10, 15, 20, 25, 30, 35, 40, 45];
  const batteryIndex = batteryCapacityMapping.indexOf(batteryCapacity);

  if (batteryIndex === -1) {
    throw new Error("Invalid battery capacity. Choose from: 5, 10, 15, 20, 25, 30, 35, 40, 45.");
  }

  if (!DEMAND_MATRIX[season]) {
    throw new Error(`Invalid season: ${season}. Choose from: "summer", "summerPeak", "winter".`);
  }

  // Sort rows by yearly values to ensure proper comparison
  const sortedRows = DEMAND_MATRIX[season].sort((a, b) => a.yearly - b.yearly);

  // Find the row with the nearest upper yearly value
  const demandRow = sortedRows.find(row => row.yearly >= totalConsumption);

  if (!demandRow) {
    throw new Error(`No data found for total consumption of ${totalConsumption} in ${season} season.`);
  }

  // Return the value at the specific battery index
  return demandRow.values[batteryIndex];
}

const SERVICE_CHARGES = {
  200: 32.44,  // ≤ 200 Amp
  201: 45.44   // > 200 Amp
};

// For winter (per given example), on-peak is 25% and off-peak is 75%.
const ON_PEAK_PERCENT_WINTER = 0.25;
const OFF_PEAK_PERCENT_WINTER = 0.75;

// Simple function to determine the season for a given month
function getSeasonForMonth(month) {
  if (SEASONS.WINTER.includes(month)) return 'WINTER';
  if (SEASONS.SUMMER.includes(month)) return 'SUMMER';
  if (SEASONS.SUMMER_PEAK.includes(month)) return 'SUMMER_PEAK';
  return 'WINTER'; // fallback
}

// Determine which demand charge rate to use
function calculateDemandCharge(season, demandKw) {
  const tiers = DEMAND_CHARGES[season];
  //console.log(tiers);
  let charge = 0;
  let remaining = demandKw;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const limit = tier.limit;
    if (limit === Infinity || remaining <= limit) {
      charge += remaining * tier.rate;
      break;
    } else {
      charge += limit * tier.rate;
      remaining -= limit;
    }
  }
  return charge;
}

function getServiceCharge(ampService) {
  return ampService > 200 ? SERVICE_CHARGES[201] : SERVICE_CHARGES[200];
}

app.post('/api/calculate', (req, res) => {
  const { batteryCapacity, ampService,monthlyConsumption,monthlySolarGeneration,totalConsumption,totalSolarGeneration } = req.body;

  // Assume 22 days per month for battery calculation as per the example
  const DAYS_PER_MONTH = 22;
  const batteryMonthly = batteryCapacity * DAYS_PER_MONTH;

  let results = [];
  let totalServiceCharge = 0;
  let totalOnPeak = 0;
  let totalOffPeak = 0;
  let totalDemand = 0;
  let totalCredits = 0;
  let annualConsumption = 0;
  let solarGeneration = 0;

  // Use 1 kW for demand calculation to match the screenshot
  
  for (const month of MONTHS) {


    const monthConsumption = monthlyConsumption[month];
    const monthSolar = monthlySolarGeneration[month]*1.2901;
    annualConsumption += monthConsumption;
    solarGeneration += monthlySolarGeneration[month]; 

    const season = getSeasonForMonth(month);
    const demandKw = getDemandValue(totalConsumption, batteryCapacity, season);
    const rateObj = RATES[season];

    let onPeakPercent;
    let offPeakPercent;

    // The example calculation is explicitly winter-based for on/off peak splits:
    if (season === 'WINTER') {
      onPeakPercent = ON_PEAK_PERCENT_WINTER;
      offPeakPercent = OFF_PEAK_PERCENT_WINTER;
    } else {
      // For simplicity, assume onPeak=30%, offPeak=70% outside winter.
      onPeakPercent = 0.30;
      offPeakPercent = 0.70;
    }

    const onPeakConsumption = monthConsumption * onPeakPercent;
    const onPeakSolar = monthSolar * PEAK_SOLAR_FACTORS[month];
    const onPeakNet = Math.max(0, onPeakConsumption - onPeakSolar - batteryMonthly);
    const onPeakCost = onPeakNet > 0 ? onPeakNet * rateObj.onPeak : 0;
    const onPeakCredit = onPeakNet < 0 ? Math.abs(onPeakNet) * rateObj.onPeak : 0;

    const offPeakConsumption = monthConsumption * offPeakPercent;
    const offPeakSolar = monthSolar - onPeakSolar;
    const offPeakNet = offPeakConsumption - offPeakSolar + batteryMonthly;
    const offPeakCost = offPeakNet > 0 ? offPeakNet * rateObj.offPeak : 0;
    const offPeakCredit = offPeakNet < 0 ? Math.abs(offPeakNet) * rateObj.offPeak : 0;

    const demandCharge = calculateDemandCharge(season, demandKw);
    const serviceCharge = getServiceCharge(ampService);

    const totalCreditThisMonth = onPeakCredit + offPeakCredit;
    const netAmount = (monthConsumption-monthSolar);
    const solarCreds = (netAmount)*(offPeakNet/(onPeakNet+offPeakNet))*rateObj.offPeak + (netAmount)*(onPeakNet/(onPeakNet+offPeakNet))*rateObj.onPeak;
    totalServiceCharge += serviceCharge;
    totalOnPeak += onPeakCost;
    totalOffPeak += offPeakCost;
    totalDemand += demandCharge;
    totalCredits += totalCreditThisMonth;
    
    results.push({
      month,
      season,
      monthConsumption,
      monthSolar,
      onPeakConsumption,
      onPeakSolar,
      offPeakConsumption,
      offPeakSolar,
      batteryUsed: batteryMonthly,
      onPeakNet,
      offPeakNet,
      onPeakRate: rateObj.onPeak,
      offPeakRate: rateObj.offPeak,
      onPeakCost,
      offPeakCost,
      demandCharge,
      serviceCharge,
      solarCredits: solarCreds,
      finalMonthCost: serviceCharge + onPeakCost + offPeakCost + demandCharge - solarCreds
    });
  }

  const summary = {
    annualConsumption,
    solarGeneration,
    batteryCapacity,
    ampService,
    totalServiceCharge,
    totalOnPeakCost: totalOnPeak,
    totalOffPeakCost: totalOffPeak,
    totalDemandCost: totalDemand,
    totalSolarCredits: totalCredits,
    grandTotal: (totalServiceCharge + totalOnPeak + totalOffPeak + totalDemand - totalCredits),
    grandTotalMonthly: (totalServiceCharge + totalOnPeak + totalOffPeak + totalDemand - totalCredits)/12
  };

  res.json({ breakdown: results, summary });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
