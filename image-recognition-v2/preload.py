import os
from transformers import pipeline
import easyocr

# Initialize Hugging Face pipeline
pipeline("image-to-text", model="nlpconnect/vit-gpt2-image-captioning")

# Initialize EasyOCR reader
easyocr.Reader(['en'], gpu=(os.getenv("IR_ENVIRONMENT") == "gpu"))
