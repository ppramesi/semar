import os
import asyncio
import easyocr
from processors.base import Processor  # Importing Processor from base.py

class OCR(Processor):
    def __init__(self):
        super().__init__()
        self.reader = easyocr.Reader(['en'], gpu=(os.getenv("IR_ENVIRONMENT") == "gpu"))  # Initialize EasyOCR reader

    async def recognize_text_and_group_by_lines(self, image_path: str):
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(self.executor, self.reader.readtext, image_path)
        print(results)

        lines = {}
        for (bbox, text, confidence) in results:
            y0 = bbox[0][1]
            if confidence > 0.8:
                if y0 not in lines:
                    lines[y0] = []
                lines[y0].append(text)

        line_strings = [' '.join(lines[y]) for y in sorted(lines)]
        return line_strings

    async def process_image_url(self, image_url: str):
        try:
            text = await self.recognize_text_and_group_by_lines(image_url)
            return text
        except Exception as e:
            # Handle exceptions or
            raise
