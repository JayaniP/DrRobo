from fastapi import FastAPI
from mangum import Mangum
import os

app = FastAPI(title="Digital Doctor API - PRODUCTION")

print("🚀 PRODUCTION FastAPI starting...")

# PRODUCTION ROUTER - Real Bedrock HealthScribe ONLY
try:
    from src.api.healthscribe.router import router as healthscribe_router
    app.include_router(healthscribe_router)
    print("✅ HealthScribe Router + Bedrock Agent LOADED")
except ImportError:
    print("❌ HealthScribe Router not found")
    # NO FALLBACK - Router only

print("✅ PRODUCTION API READY")

@app.get("/")
async def root():
    return {
        "status": "PRODUCTION READY", 
        "version": "1.0.0",
        "endpoint": "/healthscribe/agent/analyze"
    }

@app.get("/healthcheck")
async def healthcheck():
    return {"status": "healthy", "environment": "production"}

# Lambda Function URL + Amplify handler
handler = Mangum(app, lifespan="off")
