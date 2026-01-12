from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from mangum import Mangum
import os

load_dotenv()

try:
    from src.api.healthscribe.router import router as healthscribe_router
except ImportError:
    print("HealthScribe not found - running without it")
    healthscribe_router = None

print("🚀 FastAPI starting up...")

app = FastAPI(title="Digital Doctor API")

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "https://drrobo.clinic/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if healthscribe_router:
    app.include_router(healthscribe_router)

print("🚀 FastAPI Working..")

@app.get("/")
async def root():
    return {"message": "Digital Doctor API Running!"}

@app.get("/healthcheck")
async def healthcheck():
    return {"status": "healthy"}

# 🔑 THIS IS REQUIRED FOR AWS LAMBDA
handler = Mangum(app)
