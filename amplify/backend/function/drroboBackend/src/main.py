from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import os

app = FastAPI(title="Dr. Robo Production API")

# Production CORS
if os.getenv("STAGE") == "prod":
    ALLOWED_ORIGINS = ["https://drrobo.clinic"]
else:
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# PRODUCTION ROUTER - Real Bedrock Agent
try:
    from api.healthscribe.router import router as healthscribe_router
    app.include_router(healthscribe_router)
    print("✅ PRODUCTION: HealthScribe Router + Bedrock Agent LIVE")
except ImportError as e:
    print(f"❌ Router failed: {e}")
    app.get("/healthscribe/agent/analyze")(lambda: {"error": "Service unavailable"})

@app.get("/")
async def root():
    return {"status": "production-ready", "version": "1.0.0"}

handler = Mangum(app, lifespan="off")
