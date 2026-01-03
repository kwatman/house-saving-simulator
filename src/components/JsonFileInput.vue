<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Upload JSON file'
})

// v-model: strictly a JSON object (or null on error/cleared)
const model = defineModel<Record<string, any> | null>({ default: null })
const error = ref<string | null>(null)
const fileName = ref<string | null>(null)

async function onFileChange(e: Event) {
  error.value = null
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // Ensure the parsed value is an object (not null/array/primitive)
    model.value = data
    fileName.value = file.name
  } catch {
    model.value = null
    fileName.value = null
    error.value = 'Invalid JSON. Please upload a JSON object.'
  }
}

function clearSelection() {
  model.value = null
  fileName.value = null
  error.value = null
}
</script>

<template>
  <fieldset class="border rounded px-1 ">
    <legend class="text-sm  bg-white">{{ props.label }}</legend>

    <input
      type="file"
      accept=".json,application/json"
      @change="onFileChange"
      class="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold hover:file:bg-gray-200"
    />

    <div v-if="fileName || error" class="text-sm">
      <span v-if="fileName" class="text-gray-600">Selected: {{ fileName }}</span>
      <span v-if="error" class="text-red-600">{{ error }}</span>
    </div>

    <button
      v-if="fileName || model"
      type="button"
      @click="clearSelection"
      class="rounded bg-gray-100 px-1 text-xs hover:bg-gray-200"
    >
      Clear
    </button>
  </fieldset>
</template>