from sentence_transformers import CrossEncoder
import asyncio
from typing import List
from processors.base import Processor  # Importing Processor from base.py
import os

class Reranker(Processor):
    def __init__(self):
        super().__init__()
        self.model = CrossEncoder("./model")

    async def rerank(self, base_passage: str, queries: List[str]):
        print("Reranking: " + str(queries) + " with base passage: " + str(base_passage))
        loop = asyncio.get_event_loop()
        model_inputs = [[base_passage, query] for query in queries]
        scores = await loop.run_in_executor(self.executor, self.model.predict, model_inputs)
        scored_indices = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        # Extract the sorted indices
        sorted_indices = [(index, score) for index, score in scored_indices]
        print("Sorted indices: " + str(sorted_indices))
        return sorted_indices

    async def process_texts(self, base_passage: str, queries: List[str]):
        try:
            reranked = await self.rerank(base_passage, queries)
            return reranked
        except Exception as e:
            # Handle exceptions or propagate them
            raise e
