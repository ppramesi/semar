from sentence_transformers import CrossEncoder
import os

if not os.path.exists("./model"):
    os.makedirs("./model")

model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2')
model.save_pretrained("./model")
