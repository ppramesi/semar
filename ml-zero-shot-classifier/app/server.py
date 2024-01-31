from fastapi import FastAPI, Request, HTTPException
import os
from typing import List
from pydantic import BaseModel
from processors.classifier import ZeroShotClassifier

# Pydantic model for the request data
class RerankRequest(BaseModel):
    base_passage: str
    queries: List[str]

class ClassifyRequest(BaseModel):
    queries: List[str]
    classes: List[str]

app = FastAPI()

classifier = ZeroShotClassifier()

async def auth_middleware(request: Request, call_next):
    auth_token = request.headers.get('auth-token')
    if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = await call_next(request)
    return response

app.middleware('http')(auth_middleware)

@app.post("/")
async def handle_classify_request(request_data: ClassifyRequest):
    try:
        (result, scores) = await classifier.process_texts(queries=request_data.queries, classes=request_data.classes)
        return {"status": "success", "result": result, "scores": scores}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
