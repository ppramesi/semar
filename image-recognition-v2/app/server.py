from fastapi import FastAPI, Request, HTTPException
import os
from processors.ocr import OCR
from processors.captioning import Captioning

app = FastAPI()

ocr_processor = OCR()
captioning_processor = Captioning()

async def auth_middleware(request: Request, call_next):
    auth_token = request.headers.get('auth-token')
    if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = await call_next(request)
    return response

app.middleware('http')(auth_middleware)

@app.post("/ocr")
async def handle_ocr_request(request: Request):
    data = await request.json()
    image_url = data.get('imageUrl')
    try:
        ocr_result = await ocr_processor.process_image_url(image_url)
        return {"status": "success", "result": ocr_result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/caption")
async def handle_caption_request(request: Request):
    data = await request.json()
    image_url = data.get('imageUrl')
    try:
        caption_result = await captioning_processor.process_image_url(image_url)
        return {"status": "success", "result": caption_result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
