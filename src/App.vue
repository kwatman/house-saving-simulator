<script setup lang="ts">
import { computed, ref } from 'vue';
import Input from './components/Input.vue';
import dayjs from 'dayjs';
import { useMath } from './composables/usemath';
import JsonFileInput from './components/JsonFileInput.vue';

const { getPercentOf } = useMath();

//chart data
const lookAhead = ref<number>(25);
const today = ref(dayjs().format('YYYY-MM-DD'));

//Finances
const currentlySaved = ref<number>(0);
const monthlySavings = ref<number | null>(1500);
const alreadySaved = ref<Array<[string | number, number]> | null>(null);

//house
const housePrice = ref<number>(300000);

//loan
const ownInputPercent = ref<number | null>(20);
const loanTimeSpan = ref<number | null>(25);
const loanInterestRate = ref<number>(4.02); 
const maxMonthlyLoanCost = ref<number>(900);



const totalSavedMonths = computed(() => {
  if (!today.value || !lookAhead.value) return { name: 'Saved', data: [] };
  let data: [number, number][] = [];
  for (let i = 0; i <= lookAhead.value * 12; i++) {
    data.push([dayjs().add(i, 'month').valueOf(), (monthlySavings.value || 0) * i + (currentlySaved.value || 0)]);
  }

  return {
    name: 'Saved',
    data: data
  };
});

const ownInputReached = computed(() => {
  const amount = getPercentOf(ownInputPercent.value || 0, housePrice.value || 0);
  const entry = totalSavedMonths.value.data.find((item: number[]) => item[1] >= amount);
  if(!entry) return null;
  return entry?.[0];
});

const loanPaidOffBy = computed(() => {
  if(!ownInputReached.value || !loanTimeSpan.value) return null;
  return dayjs(ownInputReached.value).add(loanTimeSpan.value, 'year').valueOf();
});


const monthlyLoanCost = computed(() => {
  if (!housePrice.value || !loanTimeSpan.value || !loanInterestRate.value) 
    return { name: 'Monthly Loan Cost', data: [] };

  let data: [number, string][] = []

  for (let i = 0; i <= lookAhead.value * 12; i++) {
    if(dayjs().add(i, 'month').isBefore(ownInputReached.value)) continue;

    let savedByNow = totalSavedMonths.value.data[i][1];
    let principal = housePrice.value - savedByNow;
    
    if (principal < 0) principal = 0;


    let yearlyRateDecimal = loanInterestRate.value / 100;
    let monthlyRate = Math.pow(1 + yearlyRateDecimal, 1/12) - 1;
    
    let numberOfPayments = loanTimeSpan.value * 12;

    let monthlyCost = 0;
    if (monthlyRate > 0) {
        let numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
        let denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
        monthlyCost = principal * (numerator / denominator);
    } else {
        monthlyCost = principal / numberOfPayments;
    }

    data.push([
      dayjs().add(i, 'month').valueOf(),
      monthlyCost.toFixed(2)
    ]);
  }
  return {
    name: 'Monthly Loan Cost',
    data: data
  }
});

const monthlyLoanCostSimulated = computed(() => {
  let data: [number, string][] = []
  
  // Check of alle nodige waarden er zijn
  if (housePrice.value && loanTimeSpan.value && loanInterestRate.value && alreadySaved.value) {
    
    for (let i = 0; i <= lookAhead.value * 12; i++) {
      // Let op: hier gebruik je 'ownInputReached'. 
      // Als de simulatie sneller/trager spaart, wil je hier misschien 'ownInputReachedSimulated' gebruiken?
      if(dayjs().add(i, 'month').isBefore(ownInputReached.value)) continue;
      
      let savedByNow = totalSavedMonthsSimulatedAvarage.value.data[i][1];
      
      // AANPASSING: Geen automatische kosten meer.
      // We gaan ervan uit dat housePrice de totaalprijs is.
      let principal = housePrice.value - savedByNow;
      
      if (principal < 0) principal = 0;

      // Actuariële rentevoet (Belgische standaard)
      let yearlyRateDecimal = loanInterestRate.value / 100;
      let monthlyRate = Math.pow(1 + yearlyRateDecimal, 1/12) - 1;
      let numberOfPayments = loanTimeSpan.value * 12;

      let monthlyCost = 0;
      if (monthlyRate > 0) {
          let numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
          let denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
          monthlyCost = principal * (numerator / denominator);
      } else {
          monthlyCost = principal / numberOfPayments;
      }

      data.push([
        dayjs().add(i, 'month').valueOf(),
        monthlyCost.toFixed(2) // Consistent gemaakt met de gewone berekening (2 decimalen)
      ]);
    }
  }
  return { name: 'Monthly Loan Cost (simulation)', data: data }
});

const actualSaved = computed(() => {
  let parsedData: [number, number][] = [];
  if (alreadySaved.value){ 
    for(const entry of alreadySaved.value){
      parsedData.push([dayjs(entry[0]).valueOf(), entry[1]]);
    }
  }
  return { name: 'Actual Saved', data: parsedData };
});

const avarageSaved = computed(() => {
  let average = 0;
  let saveEntries = []
  if (alreadySaved.value){
    for(let i = 1; i < alreadySaved.value.length; i++) {
      let thisEntry = alreadySaved.value[i];
      let prevEntry = alreadySaved.value[i - 1];
      let monthsDiff = dayjs(thisEntry[0]).diff(dayjs(prevEntry[0]), 'month');
      let savedPerMonth = (thisEntry[1] - prevEntry[1]) / monthsDiff;
      for (let m = 0; m < monthsDiff; m++) { saveEntries.push(savedPerMonth); }
    }
    average = saveEntries.reduce((acc, curr) => acc + curr, 0) / saveEntries.length;
    currentlySaved.value = alreadySaved.value[alreadySaved.value.length -1][1];
  }
  return Number(average.toFixed(0));
});

const totalSavedMonthsSimulatedAvarage = computed(() => {
  let data: [number, number][] = [];
  if (alreadySaved.value){
    let startAmount =  alreadySaved.value[alreadySaved.value.length -1][1];
    for (let i = 0; i <= lookAhead.value * 12; i++) {
      if(dayjs().add(i, 'month').isBefore(dayjs(alreadySaved.value[alreadySaved.value.length - 1][0]))) continue;
      data.push([ dayjs().add(i, 'month').valueOf(), startAmount + (avarageSaved.value * i) ]);
    }
  }
  return { name: 'Saved average (simulation)', data: data };
});



//markers
const ownInputReachedSimulated = computed(() => {
  const amount = getPercentOf(ownInputPercent.value || 0, housePrice.value || 0);
  const entry = totalSavedMonthsSimulatedAvarage.value.data.find((item: number[]) => item[1] >= amount);
  if(!entry) return null;
  return entry?.[0];
});

const maxMonthlyLoanCostReached = computed(() => {
  const entry = monthlyLoanCost.value.data.find((item: [number, string]) => Number(item[1]) <= (maxMonthlyLoanCost.value || 0));
  if(!entry) return null;
  return entry?.[0];
});

const maxMonthlyLoanCostReachedSimulated = computed(() => {
  const entry = monthlyLoanCostSimulated.value.data.find((item: [number, string]) => Number(item[1]) <= (maxMonthlyLoanCost.value || 0));
  if(!entry) return null;
  return entry?.[0];
});

const enoughSavedBySimulated = computed(() => {
  const entry = totalSavedMonthsSimulatedAvarage.value.data.find((item: number[]) => item[1] >= (housePrice.value || 0));
  if(!entry) return null;
  return entry?.[0];
});

const enoughSavedBy = computed(() => {
  const entry = totalSavedMonths.value.data.find((item: number[]) => item[1] >= (housePrice.value || 0));
  if(!entry) return null;
  return entry?.[0];
});

const chartOptions = computed(() => {
  return {
   annotations: {
     xaxis: [
       { x: enoughSavedBy.value, borderColor: '#775DD0', label: { style: { color: '#fff', background: '#775DD0' }, text: "Enough saved" } },
       { x: enoughSavedBySimulated.value, borderColor: '#775DD0', label: { style: { color: '#fff', background: '#775DD0' }, text: "Enough saved (simulation)" } },
       { x: ownInputReached.value, borderColor: '#FF4560', label: { style: { color: '#fff', background: '#FF4560' }, text: "Own input Reached" } },
       { x: ownInputReachedSimulated.value, borderColor: '#FF4560', label: { style: { color: '#fff', background: '#FF4560' }, text: "Own input Reached (simulation)" } },
       { x: loanPaidOffBy.value, borderColor: '#00E396', label: { style: { color: '#fff', background: '#00E396' }, text: "Loan Paid Off" } },
       { x: maxMonthlyLoanCostReached.value, borderColor: '#008FFB', label: { style: { color: '#fff', background: '#008FFB' }, text: "Max monthly loan cost reached" } },
       { x: maxMonthlyLoanCostReachedSimulated.value, borderColor: '#008FFB', label: { style: { color: '#fff', background: '#008FFB' }, text: "Max monthly loan cost reached (simulation)" } }
     ]
   },
   xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'MMM yyyy' } },
   tooltip: { x: { format: 'MMM yyyy' } }
  };
});
</script>

<template>
  <div class="grid md:grid-cols-[auto_1fr] md:min-h-screen md:max-h-screen overflow-hidden">
    <div class="p-2 gap-4 border-r-1 overflow-y-auto max-h-screen">
      <div class="bg-slate-300 border rounded-sm p-2 ">
        <table class="w-full text-sm">
          <tbody>
            <tr>
              <td class="py-1 pr-3 text-slate-700">Own input needed</td>
              <td class="py-1 text-right">€{{ getPercentOf(ownInputPercent || 0, housePrice || 0) }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-3 text-slate-700">Own input reached by</td>
              <td class="py-1 text-right">{{ dayjs(ownInputReached || 'N/A').format('DD MMMM YYYY') }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-3 text-slate-700">Enough saved by</td>
              <td class="py-1 text-right">{{ dayjs(enoughSavedBy || 'N/A').format('DD MMMM YYYY') }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-3 text-slate-700">Loan paid off by</td>
              <td class="py-1 text-right">{{ dayjs(loanPaidOffBy || 'N/A').format('DD MMMM YYYY') }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-3 text-slate-700">Monthly payment affordable from</td>
              <td class="py-1 text-right">{{ dayjs(maxMonthlyLoanCostReached || 'N/A').format('DD MMMM YYYY') }}</td>
            </tr>
             <template v-if="alreadySaved">
              <tr><td colspan="2" class="pt-3 font-bold text-slate-800">Simulated</td></tr>
              <tr><td class="py-1 pr-3 text-slate-700">Own input reached by</td><td class="py-1 text-right">{{ dayjs(ownInputReachedSimulated || 'N/A').format('DD MMMM YYYY') }}</td></tr>
              <tr><td class="py-1 pr-3 text-slate-700">Enough saved by</td><td class="py-1 text-right">{{ dayjs(enoughSavedBySimulated || 'N/A').format('DD MMMM YYYY') }}</td></tr>
              <tr><td class="py-1 pr-3 text-slate-700">Monthly payment affordable from</td><td class="py-1 text-right">{{ dayjs(maxMonthlyLoanCostReachedSimulated || 'N/A').format('DD MMMM YYYY') }}</td></tr>
              <tr><td class="py-1 pr-3 text-slate-700">Average saved</td><td class="py-1 text-right">{{ avarageSaved }}</td></tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="border-b pt-4">Chart</div>
      <div>
        <Input label="Look Ahead" type="number" v-model="lookAhead" />
        <Input label="Today's Date" type="date" v-model="today" />
      </div>
      <div class="border-b pt-4">Finances</div>
      <div>
        <Input label="Currently saved" type="number" v-model="currentlySaved" />
        <Input label="Monthly Savings" type="number" v-model="monthlySavings" />
        <JsonFileInput v-model="alreadySaved" />
      </div>
      <div class="border-b pt-4">House</div>
      <div>
        <Input label="House Price" type="number" v-model="housePrice" />
      </div>
      <div class="border-b pt-4">Loan</div>
      <div>
        <Input label="Own input (%)" type="number" v-model="ownInputPercent" />
        <Input label="Loan timespan" type="number" v-model="loanTimeSpan" />
        <Input label="Loan interest rate" type="number" v-model="loanInterestRate" />
        <Input label="Max monthly loan cost" type="number" v-model="maxMonthlyLoanCost" />
      </div>
    </div>
    <div class="h-[500px] md:h-full min-h-0">
        <apexchart height="100%" width="100%" type="line" :options="chartOptions" :series="[totalSavedMonths,monthlyLoanCost,actualSaved,totalSavedMonthsSimulatedAvarage,monthlyLoanCostSimulated]"></apexchart>
    </div>
  </div>
</template>