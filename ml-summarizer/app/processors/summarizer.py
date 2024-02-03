from transformers import pipeline, BartTokenizer
from tokenizers import Tokenizer
from typing import Any
import asyncio
from processors.base import Processor  # Assuming base.py exists and defines Processor

class Summarizer(Processor):
    def __init__(self, summary_max_length = 250):
        super().__init__()
        self.model = pipeline("summarization", model="./model")
        # Access the tokenizer from the pipeline
        self.model_max_length = self.model.tokenizer.model_max_length
        self.summary_max_length = summary_max_length

    async def summarize(self, text: str):
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(self.executor, self._predict, text)

        return results
    
    def _recursive_summarize(self, text: str, token_counter: Any):
        # Tokenize the text and check if it exceeds the max token length
        tokens_count = token_counter(text)
        print(str(tokens_count))
        if tokens_count < self.summary_max_length:
            return text
        if tokens_count < self.model_max_length:
            # If within limit, summarize directly
            model_result = self.model(text, max_length=self.summary_max_length, do_sample=False)
            return model_result[0]["summary_text"]
        else:
            # If too long, split and summarize each half
            half_index = len(text) // 2
            split_point = text.rfind('. ', 0, half_index + 1) + 1 or half_index
            part1 = self._recursive_summarize(text[:split_point], token_counter)
            part2 = self._recursive_summarize(text[split_point:], token_counter)
            combined_summary = ' '.join([part1, part2])
            # Final summary of combined parts, if necessary
            if token_counter(combined_summary) > self.summary_max_length:
                model_result = self.model(combined_summary, max_length=self.summary_max_length, do_sample=False)
                return model_result[0]["summary_text"]
            return combined_summary

    def _predict(self, text: str):
        tokenizer = Tokenizer.from_file("./model/tokenizer.json")
        token_counter = lambda str: len(tokenizer.encode(str))
        # tokenizer = BartTokenizer.from_pretrained("./model")
        # Determine max_length based on a dynamic calculation or a fixed threshold
        return self._recursive_summarize(text, token_counter)

    async def process_texts(self, text: str):
        try:
            reranked = await self.summarize(text.replace("\n", " "))
            return reranked
        except Exception as e:
            # Handle exceptions or propagate them
            print(e)
            raise e

# from transformers import pipeline
# import asyncio
# from processors.base import Processor  # Importing Processor from base.py

# class Summarizer(Processor):
#     def __init__(self, threshold=0.75):
#         super().__init__()
#         self.model = pipeline("summarization", model="./model")
#         self.threshold = threshold

#     async def summarize(self, text: str):
#         print("Summarizing: " + str(text))
#         loop = asyncio.get_event_loop()
#         results = await loop.run_in_executor(self.executor, self._predict, text)
#         print("Results: " + str(results))

#         return results[0]["summary_text"]
    
#     def _predict(self, text: str):
#         max_length = min(len(text), 100)
#         return self.model(text, max_length=max_length, do_sample=False)

#     async def process_texts(self, text: str):
#         try:
#             reranked = await self.summarize(text)
#             return reranked
#         except Exception as e:
#             # Handle exceptions or propagate them
#             raise e
