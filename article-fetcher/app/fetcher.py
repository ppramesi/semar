import asyncio
from httpx import AsyncClient
from typing import List, Union
from newsplease import NewsPlease

class ArticleFetcher:
    async def run_fetch_articles(self, urls: List[str]) -> List[str]:
        # This method now accepts a list of URLs and returns a list of article texts
        results = await asyncio.gather(*(self._fetch_and_process_url(url) for url in urls))
        return results

    async def _fetch_and_process_url(self, url: Union[str, None]) -> str:
        if url is None:
            return None
        
        print("Fetching: " + url)
        try:
            async with AsyncClient() as client:
                response = await client.get(url)
                actual_url = response.url
                print("Fetched: " + str(actual_url))
        except Exception as e:
            print(f"Failed to fetch {url} due to: {str(e)}")
            return None
        
        # Run the synchronous NewsPlease.from_url in an executor
        loop = asyncio.get_event_loop()
        try:
            article = await loop.run_in_executor(None, NewsPlease.from_url, str(actual_url))
            if article is not None and hasattr(article, 'maintext'):
                print("Results: " + str(article.maintext))
                return article.maintext
            else:
                return None
        except Exception as e:
            print(f"Failed to process {url} due to: {str(e)}")
            return None

    async def fetch_articles(self, urls: List[str]):
        try:
            article = await self.run_fetch_articles(urls)
            return article
        except Exception as e:
            # Handle exceptions or propagate them
            raise e
