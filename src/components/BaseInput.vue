<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, watch } from 'vue';
import { refDebounced } from '@vueuse/core';

const props = withDefaults(
    defineProps<{
        label: string;
        type?: string;
        icon?: string;
        step?: number;
        debounce?: number;
    }>(),
    { debounce: 1000 },
);
const model = defineModel<number | string>();

// Local buffer for the input; pushed to the parent v-model only after
// the user pauses typing for `debounce` ms.
const local = ref(model.value);
const debounced = refDebounced(local, () => props.debounce);

watch(debounced, (next) => {
    if (next !== model.value) model.value = next;
});

// Keep local in sync if the model changes externally (inc/dec buttons, parent writes).
watch(model, (next) => {
    if (next !== local.value) local.value = next;
});

const step = () => props.step ?? 1;

// Round to the step's decimal precision so binary float drift
// (e.g. 3.99 - 0.01 = 3.9800000000000004) doesn't leak into the model.
function roundToStep(value: number) {
    const decimals = (String(step()).split('.')[1] || '').length;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function increment() {
    const current = Number(model.value) || 0;
    model.value = roundToStep(current + step());
}

function decrement() {
    const current = Number(model.value) || 0;
    model.value = roundToStep(current - step());
}
</script>

<template>
    <div class="text-label">
        <label class=" text-[12px] font-manrope uppercase ">{{ props.label }}</label>
        <div
            class="flex items-center w-full border border-border rounded-sm focus-within:ring-1 focus-within:ring-border">
            <Icon v-if="props.icon" :icon="props.icon" class="ml-2 text-muted shrink-0" />
            <input :type="props.type || 'text'" class="no-spinner w-full outline-none bg-transparent py-1 px-2"
                v-model="local" />
            <div v-if="props.type === 'number'" class="flex flex-col self-stretch border-l border-border shrink-0">
                <button type="button" @click="increment"
                    class="flex-1 flex items-center justify-center px-2 leading-none text-label hover:text-heading hover:bg-border/40 transition-colors border-b border-border">
                    <Icon icon="lucide:chevron-up" class="text-[12px]" />
                </button>
                <button type="button" @click="decrement"
                    class="flex-1 flex items-center justify-center px-2 leading-none text-label hover:text-heading hover:bg-border/40 transition-colors">
                    <Icon icon="lucide:chevron-down" class="text-[12px]" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.no-spinner {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>
