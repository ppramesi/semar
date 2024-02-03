from fastapi import FastAPI, Request, HTTPException
import os
from typing import List, Union
from pydantic import BaseModel
from fetcher import ArticleFetcher

# Pydantic model for the request data
class ArticleFetcherRequest(BaseModel):
    urls: List[Union[str, None]]

app = FastAPI()

article_fetcher = ArticleFetcher()

async def auth_middleware(request: Request, call_next):
    auth_token = request.headers.get('auth-token')
    if os.getenv('AUTH_TOKEN') and os.getenv('AUTH_TOKEN') != auth_token:
        raise HTTPException(status_code=403, detail="Unauthorized")
    response = await call_next(request)
    return response

app.middleware('http')(auth_middleware)

@app.post("/")
async def handle_fetch_article_request(request_data: ArticleFetcherRequest):
    try:
        result = await article_fetcher.fetch_articles(urls=request_data.urls)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
