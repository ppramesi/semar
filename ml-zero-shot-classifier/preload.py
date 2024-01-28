from transformers import pipeline
import os

if not os.path.exists("./model"):
    os.makedirs("./model")

model = pipeline("zero-shot-classification", model="MoritzLaurer/deberta-v3-large-zeroshot-v1.1-all-33")
model.save_pretrained("./model")