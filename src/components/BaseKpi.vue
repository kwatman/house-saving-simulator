<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from './BaseCard.vue';

const props = defineProps<{
    title: string,
    value: number | string,
    type?: 'currency'
}>()

const formatted = computed(() => {
    if (props.type === 'currency') {
        return new Intl.NumberFormat(navigator.language, {
            style: 'currency',
            currency: 'EUR',
        }).format(props.value as number);
    }
    return props.value;
})
</script>

<template>
    <BaseCard class=" ">
        <p class="font-manrope uppercase text-xs text-label font-bold mb-2">{{ title }}</p>
        <p class="text-2xl text-label">{{ formatted }}</p>
    </BaseCard>
</template>