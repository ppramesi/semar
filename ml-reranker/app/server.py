from fastapi import FastAPI, Request, HTTPException
import os
from typing import List
from pydantic import BaseModel
from processors.reranker import Reranker

# Pydantic model for the request data
class RerankRequest(BaseModel):
    base_passage: str
    queries: List[str]

class ClassifyRequest(BaseModel):
    queries: List[str]
    classes: List[str]

app = FastAPI()

reranker = Reranker()

async def auth_middleware(request: Request, call_next):
    auth_token = request.headers.get('auth-token')
    if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = await call_next(request)
    return response

app.middleware('http')(auth_middleware)

@app.post("/")
async def handle_rerank_request(request_data: RerankRequest):
    try:
        result = await reranker.process_texts(base_passage=request_data.base_passage, queries=request_data.queries)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
