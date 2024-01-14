import os
from transformers import pipeline
import easyocr

# Initialize EasyOCR reader
easyocr.Reader(['en'], gpu=(os.getenv("IR_ENVIRONMENT") == "gpu"))

# Initialize Hugging Face pipeline
pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")

