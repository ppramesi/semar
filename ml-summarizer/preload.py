from transformers import pipeline
import os

if not os.path.exists("./model"):
    os.makedirs("./model")

model = pipeline("summarization", model="google/pegasus-xsum")
model.save_pretrained("./model")