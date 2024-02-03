from abc import ABC, abstractmethod
from typing import List
from concurrent.futures import ThreadPoolExecutor

class Processor(ABC):
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2)  # Adjust max_workers as needed

    @abstractmethod
    def process_texts(self, texts: List[str]) -> List[str]:
        pass
