import asyncio
from httpx import AsyncClient
from typing import List
from newsplease import NewsPlease

class ArticleFetcher:
    async def run_fetch_articles(self, urls: List[str]) -> List[str]:
        # This method now accepts a list of URLs and returns a list of article texts
        results = await asyncio.gather(*(self._fetch_and_process_url(url) for url in urls))
        return results

    async def _fetch_and_process_url(self, url: str) -> str:
        # Asynchronous method to fetch a single URL and process it
        print("Fetching: " + url)
        async with AsyncClient() as client:
            response = await client.get(url)
            actual_url = response.url
        # Run the synchronous NewsPlease.from_url in an executor
        loop = asyncio.get_event_loop()
        article = await loop.run_in_executor(None, NewsPlease.from_url, actual_url)
        print("Results: " + str(article.maintext))
        return article.maintext

    async def fetch_articles(self, urls: List[str]):
        try:
            article = await self.run_fetch_articles(urls)
            return article
        except Exception as e:
            # Handle exceptions or propagate them
            raise e
