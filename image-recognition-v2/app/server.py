from fastapi import FastAPI, Request, HTTPException
import os
from processors.ocr import OCR  # Assuming OCR class is in processors/ocr.py
from processors.captioning import Captioning  # Assuming Captioning class in processors/captioning.py

class Server:
    def __init__(self):
        self.app = FastAPI()
        self.ocr_processor = OCR()
        self.captioning_processor = Captioning()
        self.setup_routes()

    async def auth_middleware(self, request: Request, call_next):
        auth_token = request.headers.get('auth-token')
        if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
            raise HTTPException(status_code=403, detail="Unauthorized")
        response = await call_next(request)
        return response

    def setup_routes(self):
        self.app.middleware('http')(self.auth_middleware)
        self.app.post("/ocr", self.handle_ocr_request)
        self.app.post("/caption", self.handle_caption_request)

    async def handle_caption_request(self, request: Request):
        data = await request.json()
        image_url = data.get('imageUrl')
        try:
            caption_result = await self.captioning_processor.process_image_url(image_url)
            return {"status": "success", "result": caption_result}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def handle_ocr_request(self, request: Request):
        data = await request.json()
        image_url = data.get('imageUrl')
        try:
            ocr_result = await self.ocr_processor.process_image_url(image_url)
            return {"status": "success", "result": ocr_result}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def listen(self, host: str, port: int):
        import uvicorn
        uvicorn.run(self.app, host=host, port=port)
