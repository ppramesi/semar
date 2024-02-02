from transformers import pipeline
import os

if not os.path.exists("./model"):
    os.makedirs("./model")

model = pipeline("summarization", model="facebook/bart-large-cnn")
model.save_pretrained("./model")