from sentence_transformers import CrossEncoder
from transformers import file_utils
import os
import shutil

if not os.path.exists("./model"):
    os.makedirs("./model")

model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2')
model.save_pretrained("./model")

# Get the default cache directory path
cache_path = file_utils.default_cache_path

# Check if the cache directory exists, and if so, remove it
if os.path.exists(cache_path) and os.getenv("IN_DOCKER_CONTAINER") == "true":
    shutil.rmtree(cache_path)
    print(f"Cache directory {cache_path} has been removed.")