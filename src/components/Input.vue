<script setup lang="ts">
const props = defineProps<{
    label: string
    type?: string
}>()
const model = defineModel()

</script>


<template>
    <fieldset class="border rounded px-1">
        <legend class="text-sm  bg-white">{{ props.label }}</legend>
        <input :type="props.type || 'text'" class="w-full outline-none" v-model="model" />
    </fieldset>
</template>