<script setup lang="ts">
import { type ScrapeAccount } from './types/scrape_account';
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
const searchQuery = ref<string>("");
const searching = ref<boolean>(false);
const showSpinner = ref<boolean>(false);

const { data: tagData } = await useFetch<Tag[]>("/api/tags");

const { data: accountsData } = await useFetch<ScrapeAccount[]>("/api/scrape_accounts");

const scrapeAccounts = joinWithCommasAnd(accountsData.value?.map(account => `@${account.name}`))

const summariesEndpoint = "/api/summaries";
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

async function fetchSummaries(page: number){
  showSpinner.value = true;
  const summariesEndpoint = page ? `/api/summaries/${page}` : "/api/summaries";
  const newSummaries = await $fetch<Summary[]>(summariesEndpoint);
  allSummaries.value = [...allSummaries.value, ...(newSummaries ?? [])];

  // Re-fetch tweets if needed
  const fetchTweetIds = Array.from(new Set((newSummaries ?? []).map((summary) => summary.ref_tweets).flat()));
  const newTweetData = await $fetch<Tweet[]>("/api/tweets", {
    method: "POST",
    body: JSON.stringify(fetchTweetIds)
  });

  // Update the refTweets
  (newSummaries ?? []).forEach((summary) => {
    const tweets = newTweetData.filter((tweet) => summary.ref_tweets.includes(tweet.id));
    if (tweets) {
      refTweets.value[summary.id] = tweets;
    }
  });
  showSpinner.value = false;
}

async function searchSummaries(){
  if(searchQuery.value && searchQuery.value.length > 0){
    showSpinner.value = true;
    try {
      const searchSummaries = await $fetch<Summary[]>("/api/semantic_search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery.value })
      });
      allSummaries.value = [...(searchSummaries ?? [])];

      // Re-fetch tweets if needed
      const fetchTweetIds = Array.from(new Set((searchSummaries ?? []).map((summary) => summary.ref_tweets).flat()));
      const newTweetData = await $fetch<Tweet[]>("/api/tweets", {
        method: "POST",
        body: JSON.stringify(fetchTweetIds)
      });

      // Update the refTweets
      (searchSummaries ?? []).forEach((summary) => {
        const tweets = newTweetData.filter((tweet) => summary.ref_tweets.includes(tweet.id));
        if (tweets) {
          refTweets.value[summary.id] = tweets;
        }
      });
    } catch (error) {
      console.error(error);
      useNuxtApp().$toast.error((error as Error).message);
    } finally {
      showSpinner.value = false;
    }
  }
}

async function clearSearch(){
  searchQuery.value = "";
  await fetchSummaries(0);
  searching.value = false;
}

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
    <Transition>
      <div v-if="showSpinner" class="text-center w-screen h-screen absolute flex justify-center items-center bg-black bg-opacity-30">
          <div role="status">
              <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span class="sr-only">Loading...</span>
          </div>
      </div>
    </Transition>
    
    <div class="flex flex-col w-192 mx-auto">
      <h1 class="mb-4 mt-6 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl">News for {{ tags }} from {{ scrapeAccounts }}</h1>
      <div v-if="value && value?.length > 0">
        <form @submit.prevent="searchSummaries">   
          <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
          <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                  </svg>
              </div>
              <input v-model="searchQuery" type="search" id="default-search" class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search Summaries" required>
              <button v-if="!searching || searchQuery.length == 0" value="submit" type="submit" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
              <button v-else @click="clearSearch" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Clear</button>
          </div>
      </form>
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
            <div class="flex flex-col">
              <div v-for="source in refTweets[summary.id]" class="my-2 p-4 border border-gray-300 rounded-md">
                <div class="mb-2">
                  {{ source.text }}
                </div>
                <div class="mb-2">
                  <a :href="source.url" target="_blank">
                    {{ source.url }}
                  </a>
                </div>
                <div>
                  Tags: {{ joinWithCommasAnd(source.tags) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!searching" class="w-full">
          <button 
            @click="loadMore"
            class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
          >
            Load More
          </button>
        </div>
      </div>
      <div v-else>
        No News :(
      </div>
    </div>
  </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>