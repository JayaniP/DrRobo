from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from mangum import Mangum
import os

# Load environment variables
load_dotenv()

# Attempt to import the HealthScribe router
try:
    # Ensure your folder structure has api/__init__.py and healthscribe/__init__.py
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

# --- CORS CONFIGURATION ---
# This allows your React frontend to talk to this API
origins = [
    "http://localhost:5173",    # Standard Vite port
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://drrobo.clinic",     # Production Frontend
    "https://www.drrobo.clinic"
]

# This must be defined BEFORE your routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://drrobo.clinic"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
# Mangum acts as the bridge between AWS Lambda/API Gateway and FastAPI
handler = Mangum(app, lifespan="off")