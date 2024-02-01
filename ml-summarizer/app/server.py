from fastapi import FastAPI, Request, HTTPException
import os
from typing import List
from pydantic import BaseModel
from processors.summarizer import Summarizer

# Pydantic model for the request data
class SummarizerRequest(BaseModel):
    text: str

app = FastAPI()

summarizer = Summarizer()

async def auth_middleware(request: Request, call_next):
    auth_token = request.headers.get('auth-token')
    if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = await call_next(request)
    return response

app.middleware('http')(auth_middleware)

@app.post("/")
async def handle_summarize_request(request_data: SummarizerRequest):
    try:
        result = await summarizer.process_texts(text=request_data.text)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
