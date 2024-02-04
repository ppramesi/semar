from dotenv import load_dotenv
from urllib.parse import urlparse
import os
import uvicorn

load_dotenv()

if __name__ == "__main__":
    url = os.getenv('ZERO_SHOT_CLASSIFIER_URL')
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname
    port = parsed_url.port
    print(hostname)
    print("FuckfuckfuckFuckfuckfuck")
    uvicorn.run("server:app", host=hostname, port=int(os.getenv('ZERO_SHOT_CLASSIFIER_PORT')))