<script setup lang="ts">
import { type Summary } from './types/summary';

const { data } = await useFetch<Summary[]>("/api/summaries");
const { value } = data;
</script>

<template>
  <div class="w-screen">
    <div class="flex flex-col w-96 mx-auto">
      <div 
        v-if="value && value?.length > 0" 
        v-for="summary in value"
      >
        <div>
          {{ summary.id }}
        </div>
        <div>
          {{ summary.text }}
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
