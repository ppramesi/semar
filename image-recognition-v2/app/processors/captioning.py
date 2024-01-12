import asyncio
from transformers import pipeline
from base import Processor  # Importing Processor from base.py

class Captioning(Processor):
    def __init__(self):
        super().__init__()
        self.caption_pipeline = pipeline("image-to-text", model="Xenova/vit-gpt2-image-captioning")

    async def generate_caption(self, image_path: str):
        loop = asyncio.get_event_loop()
        caption = await loop.run_in_executor(self.executor, self.caption_pipeline, image_path)
        return caption

    async def process_image_url(self, image_url: str):
        try:
            caption = await self.generate_caption(image_url)
            return [c['generated_text'] for c in caption]
        except Exception as e:
            # Handle exceptions or propagate them
            raise
