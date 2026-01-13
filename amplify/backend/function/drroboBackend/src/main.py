from fastapi import FastAPI
# Removed CORSMiddleware import as it's now handled by AWS infrastructure
from dotenv import load_dotenv
from mangum import Mangum
import os

# Load environment variables
load_dotenv()

# Attempt to import the HealthScribe router
try:
    from api.healthscribe.router import router as healthscribe_router
except (ImportError, ModuleNotFoundError) as e:
    print(f"⚠️ HealthScribe router import failed: {e}")
    healthscribe_router = None

print("🚀 Dr. Robo Backend: Initializing...")

app = FastAPI(
    title="Digital Doctor API",
    description="Backend for Dr. Robo - AI Medical Consultation & Transcription",
    version="1.0.0"
)

# --- IMPORTANT: CORS IS NOW HANDLED BY AWS LAMBDA CONSOLE ---
# We have removed the app.add_middleware(CORSMiddleware) block from here
# to prevent the "Multiple values for Access-Control-Allow-Origin" error.

# --- ROUTER INCLUSION ---
if healthscribe_router:
    app.include_router(healthscribe_router)
    print("✅ HealthScribe Router: Connected")
else:
    print("❌ HealthScribe Router: Not Found")

# --- BASIC ENDPOINTS ---
@app.get("/")
async def root():
    """Welcome message for the API root."""
    return {
        "message": "Digital Doctor API is online!",
        "docs": "/docs",
        "health": "/healthcheck"
    }

@app.get("/healthcheck")
async def healthcheck():
    """Standard healthcheck for AWS and monitoring tools."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("STAGE", "development")
    }

# --- AWS LAMBDA HANDLER ---
handler = Mangum(app, lifespan="off")