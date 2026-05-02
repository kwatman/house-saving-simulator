<script setup lang="ts">
import { onMounted, onBeforeUnmount, shallowRef, watch, useTemplateRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
    option: echarts.EChartsOption
}>()

const container = useTemplateRef<HTMLDivElement>('container')
const chart = shallowRef<echarts.ECharts>()
let observer: ResizeObserver | undefined

onMounted(() => {
    chart.value = echarts.init(container.value)
    chart.value.setOption(props.option)
    observer = new ResizeObserver(() => chart.value?.resize())
    if (container.value) observer.observe(container.value)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    chart.value?.dispose()
})

watch(
    () => props.option,
    (option) => chart.value?.setOption(option, true),
    { deep: true },
)
</script>

<template>
    <div ref="container" class="h-full w-full"></div>
</template>
