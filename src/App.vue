<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseCard from './components/BaseCard.vue';
import BaseInput from './components/BaseInput.vue';
import BaseKpi from './components/BaseKpi.vue';
import Chart from './components/Chart.vue';
import JsonFileInput from './components/JsonFileInput.vue';
import dayjs from 'dayjs';
import type { EChartsOption } from 'echarts';


//inputs
const currentSavings = ref(0);
const monthlySavings = ref(0);
const bankBalanceHistory = ref<[string, number][] | null>(null);

const loanTerm = ref(20);
const interestRate = ref(4);


const purchasePrice = ref(400000);
const maxMonthlyRepayment = ref(900);

//options
const lookAhead = ref(30);


const ownContribution = computed(() => {
    return purchasePrice.value * 0.10
})

const toLoan = computed(() => {
    return purchasePrice.value - currentSavings.value
})

const totalInterestPaid = computed(() => {
    const principal = toLoan.value
    const repayment = monthlyRepaymentForLoan(principal)
    return Math.max(repayment * loanTerm.value * 12 - principal, 0)
})


const ownContributionReachedby = computed(() => {
    const toSave = ownContribution.value - currentSavings.value
    if (toSave <= 0) return 'Already reached'
    if (monthlySavings.value <= 0) return 'Never'
    const monthsLeft = Math.ceil(toSave / monthlySavings.value)
    return dayjs().add(monthsLeft, 'months').format('MMM YYYY')
})

const enoughSavedBy = computed(() => {
    const toSave = purchasePrice.value - currentSavings.value
    if (toSave <= 0) return 'Already reached'
    if (monthlySavings.value <= 0) return 'Never'
    const monthsLeft = Math.ceil(toSave / monthlySavings.value)
    return dayjs().add(monthsLeft, 'months').format('MMM YYYY')
})

// Last recorded bank balance — used as the simulation's starting point.
const simulatedStartBalance = computed(() => {
    const entries = bankBalanceHistory.value
    return entries?.length ? entries[entries.length - 1][1] : 0
})

const reachedAtSimulated = (target: number) => {
    if (!bankBalanceHistory.value?.length) return '—'
    const toSave = target - simulatedStartBalance.value
    if (toSave <= 0) return 'Already reached'
    if (historicalMonthlySavings.value <= 0) return 'Never'
    const monthsLeft = Math.ceil(toSave / historicalMonthlySavings.value)
    return dayjs().add(monthsLeft, 'months').format('MMM YYYY')
}

const ownContributionReachedbySimulated = computed(() =>
    reachedAtSimulated(ownContribution.value)
)

const enoughSavedBySimulated = computed(() =>
    reachedAtSimulated(purchasePrice.value)
)

// Average monthly delta across the recorded bank balance history.
const historicalMonthlySavings = computed(() => {
    const entries = bankBalanceHistory.value
    if (!entries || entries.length < 2) return 0
    const first = entries[0]
    const last = entries[entries.length - 1]
    const months = dayjs(last[0]).diff(dayjs(first[0]), 'month')
    if (months <= 0) return 0
    return (last[1] - first[1]) / months
})



const savingsChartOption = computed<EChartsOption>(() => {
    const months: string[] = []
    const balances: number[] = []
    const simulated: number[] = []
    const lastEntry = bankBalanceHistory.value?.[bankBalanceHistory.value.length - 1]
    const simStart = lastEntry?.[1] ?? 0
    let balance = currentSavings.value
    for (let i = 0; i <= lookAheadMonths.value - 1; i++) {
        months.push(dayjs().add(i, 'months').format('MMM YY'))
        balances.push(Math.round(balance))
        simulated.push(Math.round(simStart + historicalMonthlySavings.value * i))
        balance += monthlySavings.value
    }
    const series: EChartsOption['series'] = [
        { name: 'Savings', type: 'line', smooth: true, data: balances },
    ]
    if (historicalMonthlySavings.value > 0) {
        series.push({
            name: 'Simulated',
            type: 'line',
            smooth: true,
            data: simulated,
            lineStyle: { type: 'dashed' },
            symbol: 'none',
        })
    }
    return {
        tooltip: { trigger: 'axis' },
        grid: { left: 40, right: 16, top: 24, bottom: 32 },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value' },
        series,
    }
})


const lookAheadMonths = computed(() => {
    return lookAhead.value * 12
})


const monthlyRepaymentForLoan = (principal: number) => {
    if (principal <= 0) return 0

    // Convert the loan term from years to the total number of monthly payments.
    const numberOfPayments = loanTerm.value * 12
    if (numberOfPayments <= 0) return 0

    // Convert the yearly interest rate (in %) to a monthly decimal rate.
    // e.g. 4% per year -> 0.04 / 12 ≈ 0.00333 per month.
    const monthlyInterestRate = interestRate.value / 100 / 12

    // With no interest, the loan is just split evenly across all months.
    if (monthlyInterestRate === 0) return principal / numberOfPayments

    // Standard amortization formula for a fixed monthly payment:
    //   payment = P * r / (1 - (1 + r)^-n)
    // where P = principal, r = monthly interest rate, n = number of payments.
    // It's derived from the present value of an annuity: the sum of all
    // discounted future payments must equal the borrowed principal.
    return (
        (principal * monthlyInterestRate) /
        (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments))
    )
}

// Single pass over the look-ahead window: builds the chart series AND
// captures the first month at which the required loan principal is small
// enough that its monthly repayment fits under maxMonthlyRepayment.
const repaymentProjection = computed(() => {
    const months: string[] = []
    const repayments: number[] = []
    const simulatedRepayments: number[] = []
    const simStart = simulatedStartBalance.value
    let savings = currentSavings.value
    let affordableFromIndex = -1
    let affordableFromIndexSimulated = -1

    for (let i = 0; i < lookAheadMonths.value; i++) {
        months.push(dayjs().add(i, 'months').format('MMM YY'))
        const principal = Math.max(purchasePrice.value - savings, 0)
        const repayment = monthlyRepaymentForLoan(principal)
        repayments.push(Math.round(repayment))

        const simSavings = simStart + historicalMonthlySavings.value * i
        const simPrincipal = Math.max(purchasePrice.value - simSavings, 0)
        const simRepayment = monthlyRepaymentForLoan(simPrincipal)
        simulatedRepayments.push(Math.round(simRepayment))

        if (affordableFromIndex === -1 && repayment <= maxMonthlyRepayment.value) {
            affordableFromIndex = i
        }
        if (affordableFromIndexSimulated === -1 && simRepayment <= maxMonthlyRepayment.value) {
            affordableFromIndexSimulated = i
        }

        savings += monthlySavings.value
    }
    return { months, repayments, simulatedRepayments, affordableFromIndex, affordableFromIndexSimulated }
})

const monthlyPaymentAffordableBy = computed(() => {
    const { affordableFromIndex } = repaymentProjection.value
    if (affordableFromIndex === 0) return 'Already affordable'
    if (affordableFromIndex === -1) return `Not within ${lookAhead.value}y`
    return dayjs().add(affordableFromIndex, 'months').format('MMM YYYY')
})

const monthlyPaymentAffordableBySimulated = computed(() => {
    if (!bankBalanceHistory.value?.length) return '—'
    const { affordableFromIndexSimulated } = repaymentProjection.value
    if (affordableFromIndexSimulated === 0) return 'Already affordable'
    if (affordableFromIndexSimulated === -1) return `Not within ${lookAhead.value}y`
    return dayjs().add(affordableFromIndexSimulated, 'months').format('MMM YYYY')
})

const monthlyRepaymentChartOptions = computed<EChartsOption>(() => {
    const { months, repayments, simulatedRepayments } = repaymentProjection.value
    const series: EChartsOption['series'] = [
        { name: 'Monthly repayment', type: 'line', smooth: true, data: repayments },
        {
            name: 'Max monthly repayment',
            type: 'line',
            data: months.map(() => maxMonthlyRepayment.value),
            lineStyle: { type: 'dashed' },
            symbol: 'none',
        },
    ]
    if (historicalMonthlySavings.value > 0) {
        series.push({
            name: 'Simulated',
            type: 'line',
            smooth: true,
            data: simulatedRepayments,
            lineStyle: { type: 'dashed' },
            symbol: 'none',
        })
    }
    return {
        tooltip: { trigger: 'axis', valueFormatter: (v) => `€${v}` },
        grid: { left: 50, right: 16, top: 24, bottom: 32 },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value', axisLabel: { formatter: '€{value}' } },
        series,
    }
})

</script>

<template>
    <div class="h-screen w-full bg-background font-inter text-white grid grid-cols-[auto_1fr] overflow-hidden">
        <div class="p-4 h-screen overflow-y-auto">
            <BaseCard>
                <h1 class="text-heading text-2xl mb-4">Configure settings</h1>
                <h2 class="text-heading text-1xl ">Financial</h2>
                <div class="space-y-3 mb-4">
                    <BaseInput v-model="currentSavings" label="current savings" type="number" icon="lucide:euro" />
                    <BaseInput v-model="monthlySavings" label="monthly savings" type="number" icon="lucide:euro" />
                    <JsonFileInput v-model="bankBalanceHistory" label="bank balance history" />
                </div>
                <h2 class="text-heading text-1xl mb-4">Loan</h2>
                <div class="space-y-3">
                    <BaseInput v-model="loanTerm" label="loan term" type="number" icon="lucide:clock" />
                    <BaseInput v-model="interestRate" :step="0.01" label="interest rate" type="number"
                        icon="lucide:percent" />
                </div>

                <h2 class="text-heading text-1xl ">Goal</h2>
                <div class="space-y-3">
                    <BaseInput v-model="purchasePrice" label="purchase price" type="number" icon="lucide:euro" />
                    <BaseInput v-model="maxMonthlyRepayment" label="max monthly repayment" type="number"
                        icon="lucide:euro" />
                </div>
            </BaseCard>
        </div>
        <div class="p-4 h-screen overflow-y-auto min-w-0">
            <div class="flex flex-wrap gap-4">
                <BaseKpi title="own contribution" :value="ownContribution" type="currency" />
                <BaseKpi title="to loan" :value="toLoan" type="currency" />
                <BaseKpi title="total interest paid" :value="totalInterestPaid" type="currency" />
                <BaseKpi title="own contribution reached on" :value="ownContributionReachedby" />
                <BaseKpi title="Enough saved on" :value="enoughSavedBy" />
                <BaseKpi title="Monthly payment afordable" :value="monthlyPaymentAffordableBy" />
            </div>
            <div v-if="bankBalanceHistory?.length" class="flex flex-wrap gap-4 mt-4">
                <BaseKpi title="Average saved by month" :value="historicalMonthlySavings" type="currency" />
                <BaseKpi title="own contribution reached on (sim)" :value="ownContributionReachedbySimulated" />
                <BaseKpi title="Enough saved on (sim)" :value="enoughSavedBySimulated" />
                <BaseKpi title="Monthly payment afordable (sim)" :value="monthlyPaymentAffordableBySimulated" />
            </div>
            <BaseCard class="mt-4">
                <h2 class="text-heading text-1xl mb-4">Savings projection</h2>
                <div class="h-80">
                    <Chart :option="savingsChartOption" />
                </div>
            </BaseCard>
            <BaseCard class="mt-4">
                <h2 class="text-heading text-1xl mb-4">Monthly repayment</h2>
                <div class="h-80">
                    <Chart :option="monthlyRepaymentChartOptions" />
                </div>
            </BaseCard>
        </div>
    </div>
</template>
