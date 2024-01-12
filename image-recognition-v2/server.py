from app.server import Server
from dotenv import load_dotenv
import os

load_dotenv()

if __name__ == "__main__":
    server = Server()
    server.listen(host=os.getenv('IMAGE_RECOGNITIONV2_URL'), port=os.getenv('IMAGE_RECOGNITIONV2_PORT'))