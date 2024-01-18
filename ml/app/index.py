from dotenv import load_dotenv
from urllib.parse import urlparse
import os
import uvicorn

load_dotenv()

if __name__ == "__main__":
    url = os.getenv('ML_URL')
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname
    print(hostname)
    uvicorn.run("server:app", host=hostname, port=int(os.getenv('ML_PORT')))