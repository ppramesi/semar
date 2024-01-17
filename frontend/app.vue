<script setup lang="ts">
import { type Summary } from './types/summary';
import { type Tweet } from './types/tweet';
import { marked } from "marked";

const { data: summaryData } = await useFetch<Summary[]>("/api/summaries");
const fetchTweetIds = Array.from(new Set(summaryData.value?.map((summary) => summary.ref_tweets).flat()));
const { data: tweetData } = await useFetch<Tweet[]>("/api/tweets", {
  method: "POST",
  body: JSON.stringify(fetchTweetIds)
});

const value = summaryData.value?.map((summary) => {
  return {
    ...summary,
    text: marked.parse(summary.text)
  }
});

const refTweets = value?.reduce((acc, summary) => {
  const tweets = tweetData.value?.filter((tweet) => summary.ref_tweets.includes(tweet.id));
  if (tweets) {
    acc[summary.id] = tweets;
  }
  return acc;
}, {} as Record<string, Tweet[]>) ?? {} as Record<string, Tweet[]>;
</script>

<template>
  <div class="w-screen">
    <div class="flex flex-col w-192 mx-auto">
      <div 
        class="my-2 pb-4 px-6 border border-gray-300 rounded-md"
        v-if="value && value?.length > 0" 
        v-for="summary in value"
      >
        <div class="pb-2 prose">
          <div v-html="summary.text"></div>
        </div>
        <div class="flex flex-col">
          <div class="flex flex-col">
            Sources:
          </div>
          <div v-for="source in refTweets[summary.id]">
            <div v-if="source">
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
      <div v-else>
        No data
      </div>
    </div>
  </div>
</template>
