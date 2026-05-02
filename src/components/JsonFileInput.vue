<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, useTemplateRef } from 'vue';

const props = withDefaults(
    defineProps<{
        label?: string;
        icon?: string;
    }>(),
    {
        label: 'Upload JSON file',
        icon: 'lucide:file-json',
    }
);

const model = defineModel<[string, number][] | null>({ default: null });
const error = ref<string | null>(null);
const fileName = ref<string | null>(null);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

async function onFileChange(e: Event) {
    error.value = null;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        model.value = JSON.parse(text);
        fileName.value = file.name;
    } catch {
        model.value = null;
        fileName.value = null;
        error.value = 'Invalid JSON file';
    }
}

function openPicker() {
    fileInput.value?.click();
}

function clearSelection() {
    model.value = null;
    fileName.value = null;
    error.value = null;
    if (fileInput.value) fileInput.value.value = '';
}
</script>

<template>
    <div class="text-label">
        <label class="text-[12px] font-manrope uppercase">{{ props.label }}</label>
        <div
            class="flex items-center w-full border border-border rounded-sm focus-within:ring-1 focus-within:ring-border">
            <Icon :icon="props.icon" class="ml-2 text-muted shrink-0" />
            <button type="button" @click="openPicker"
                class="flex-1 text-left truncate py-1 px-2 outline-none bg-transparent text-label hover:text-heading transition-colors">
                {{ fileName ?? 'Choose a file…' }}
            </button>
            <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onFileChange" />
            <button v-if="fileName" type="button" @click="clearSelection"
                class="self-stretch flex items-center justify-center px-2 border-l border-border text-label hover:text-heading hover:bg-border/40 transition-colors">
                <Icon icon="lucide:x" class="text-[14px]" />
            </button>
        </div>
        <p v-if="error" class="mt-1 text-[12px] text-red-400">{{ error }}</p>
    </div>
</template>
