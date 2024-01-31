from transformers import pipeline
import asyncio
from typing import List, Dict
from processors.base import Processor  # Importing Processor from base.py

class ZeroShotClassifier(Processor):
    def __init__(self, threshold=0.75):
        super().__init__()
        self.model = pipeline("zero-shot-classification", model="./model")
        self.threshold = threshold

    async def classify(self, queries: List[str], classes: List[str]):
        print("Classifying: " + str(queries) + " with classes: " + str(classes))
        loop = asyncio.get_event_loop()
        tasks = [loop.run_in_executor(self.executor, self._predict, query, classes) for query in queries]
        results = await asyncio.gather(*tasks)
        print("Results: " + str(results))

        filtered_results = []
        filtered_scores = []
        for result in results:
            # Filter labels for each query based on the threshold
            labels_scores = [(label, score) for label, score in zip(result['labels'], result['scores']) if score >= self.threshold]
            filtered_results.append(map(lambda x: x[0], labels_scores))
            filtered_scores.append(map(lambda x: x[1], labels_scores))

        return (filtered_results, filtered_scores)

    def _predict(self, query: str, classes: List[str]):
        return self.model(query, classes, multi_label=True)

    async def process_texts(self, queries: List[str], classes: List[str]):
        try:
            reranked = await self.classify(queries, classes)
            return reranked
        except Exception as e:
            # Handle exceptions or propagate them
            raise e
