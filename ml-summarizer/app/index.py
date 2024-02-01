from dotenv import load_dotenv
from urllib.parse import urlparse
import os
import uvicorn

load_dotenv()

if __name__ == "__main__":
    url = os.getenv('SUMMARIZER_URL')
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname
    port = parsed_url.port
    print(hostname)
    uvicorn.run("server:app", host=hostname, port=int(os.getenv('SUMMARIZER_PORT')))