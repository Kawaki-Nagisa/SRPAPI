// server.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const MONTHLY_CONSUMPTION_WEIGHTS = {
  January: 7.13,
  February: 6.19,
  March: 5.35,
  April: 5.48,
  May: 7.15,
  June: 10.09,
  July: 14.13,
  August: 14.17,
  September: 11.62,
  October: 8.43,
  November: 4.74,
  December: 5.52
};

const MONTHLY_SOLAR_PERCENTAGES = {
  January: 7.31,
  February: 10.90,
  March: 12.23,
  April: 13.22,
  May: 13.67,
  June: 15.23,
  July: 15.11,
  August: 14.15,
  September: 10.80,
  October: 6.93,
  November: 5.01,
  December: 4.46
};

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

const PEAK_DEMAND = {
  January: 1,
  February: 1,
  March: 1,
  April: 1,
  May: 3,
  June: 3,
  July: 4,
  August: 4,
  September: 3,
  October: 3,
  November: 1,
  December: 1
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
  const { annualConsumption, solarGeneration, batteryCapacity, ampService } = req.body;

  // Assume 22 days per month for battery calculation as per the example
  const DAYS_PER_MONTH = 22;
  const batteryMonthly = batteryCapacity * DAYS_PER_MONTH;

  let results = [];
  let totalServiceCharge = 0;
  let totalOnPeak = 0;
  let totalOffPeak = 0;
  let totalDemand = 0;
  let totalCredits = 0;

  // Use 1 kW for demand calculation to match the screenshot
  
  for (const month of Object.keys(MONTHLY_CONSUMPTION_WEIGHTS)) {
    const demandKw = PEAK_DEMAND[month];
    //console.log(month);
    const monthConsumption = annualConsumption * (MONTHLY_CONSUMPTION_WEIGHTS[month] / 100);
    const monthSolar = solarGeneration * (MONTHLY_SOLAR_PERCENTAGES[month] / 100);

    const season = getSeasonForMonth(month);
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
