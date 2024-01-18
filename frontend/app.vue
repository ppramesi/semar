<script setup lang="ts">
import { type Summary } from './types/summary';
import { type Tweet } from './types/tweet';
import { type Tag } from './types/tag';
import { marked } from "marked";
import { ref } from 'vue';

function joinWithCommasAnd(array?: string[]): string {
  if (!array) {
    return "";
  }

  if (array.length <= 1) {
    return array.join('');
  }
  const lastElement = array.pop();
  return `${array.join(', ')} and ${lastElement}`;
}

const currentPage = ref(0);
const allSummaries = ref<Summary[]>([]);
const refTweets = ref<{ [key: string]: Tweet[] }>({});

const { data: tagData } = await useFetch<Tag[]>("/api/tags");

async function fetchSummaries(page?: number){
  const summariesEndpoint = page ? `/api/summaries/${page}` : "/api/summaries";
    const { data: newSummaries } = await useFetch<Summary[]>(summariesEndpoint);
    allSummaries.value = [...allSummaries.value, ...(newSummaries.value ?? [])];

    // Re-fetch tweets if needed
    const fetchTweetIds = Array.from(new Set((newSummaries.value ?? []).map((summary) => summary.ref_tweets).flat()));
    const { data: newTweetData } = await useFetch<Tweet[]>("/api/tweets", {
      method: "POST",
      body: JSON.stringify(fetchTweetIds)
    });

    // Update the refTweets
    (newSummaries.value ?? []).forEach((summary) => {
      const tweets = newTweetData.value?.filter((tweet) => summary.ref_tweets.includes(tweet.id));
      if (tweets) {
        refTweets.value[summary.id] = tweets;
      }
    });
}

fetchSummaries();

async function loadMore() {
  currentPage.value += 1;
  await fetchSummaries(currentPage.value);
}

const value = computed(() => {
  return allSummaries.value.map((summary) => {
    return {
      ...summary,
      text: marked.parse(summary.text) as string
    }
  });
});

const tags = joinWithCommasAnd(tagData.value?.map(v => v.tag));
</script>

<template>
  <div class="w-screen">
    <div class="flex flex-col w-192 mx-auto">
      <h1 class="mb-4 mt-6 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">News for {{ tags }}</h1>
      <div v-if="value && value?.length > 0">
        <div 
          class="my-2 py-6 px-8 border border-gray-300 rounded-md"
          v-for="summary in value"
        >
          <div class="pb-2 prose">
            <div v-html="summary.text"></div>
          </div>
          <div class="flex flex-col">
            <div class="flex flex-col">
              Sources:
            </div>
            <div v-for="source in refTweets[summary.id]" class="my-2">
              <div>
                <a :href="source.url" target="_blank">
                  {{ source.url }}
                </a>
              </div>
              <div>
                {{ source.text }}
              </div>
            </div>
          </div>
        </div>
        <button 
          @click="loadMore"
          class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
        >
          Load More
        </button>
      </div>
      <div v-else>
        No News :(
      </div>
    </div>
  </div>
</template>
