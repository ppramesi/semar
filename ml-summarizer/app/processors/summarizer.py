from transformers import pipeline
import asyncio
from processors.base import Processor  # Importing Processor from base.py

class Summarizer(Processor):
    def __init__(self, threshold=0.75):
        super().__init__()
        self.model = pipeline("summarization", model="./model")
        self.threshold = threshold

    async def summarize(self, text: str):
        print("Summarizing: " + str(text))
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(self.executor, self._predict, text)
        print("Results: " + str(results))

        return results[0]["summary_text"]
    
    def _predict(self, text: str):
        return self.model(text, max_length=min(len(text), 500))

    async def process_texts(self, text: str):
        try:
            reranked = await self.summarize(text)
            return reranked
        except Exception as e:
            # Handle exceptions or propagate them
            raise e
