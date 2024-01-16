<script setup lang="ts">
import { type Summary } from './types/summary';
import { marked } from "marked";

const { data } = await useFetch<Summary[]>("/api/summaries");
const value = data.value?.map((summary) => {
  return {
    ...summary,
    text: marked.parse(summary.text)
  }
});

</script>

<template>
  <div class="w-screen">
    <div class="flex flex-col w-96 mx-auto">
      <div 
        class="my-2"
        v-if="value && value?.length > 0" 
        v-for="summary in value"
      >
        <div class="pb-2">
          {{ summary.id }}
        </div>
        <div class="pb-2 prose">
          <div v-html="summary.text"></div>
        </div>
        <div>
          {{ summary.ref_tweets.join(", ") }}
        </div>
      </div>
      <div v-else>
        No data
      </div>
    </div>
  </div>
</template>
