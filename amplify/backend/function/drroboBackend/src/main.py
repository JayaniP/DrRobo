import os
import sys
from fastapi import FastAPI, Request
from mangum import Mangum

# Add the current directory to sys.path so imports work in Lambda
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Digital Doctor API")

# 1. IMPORT THE ROUTER
try:
    # We try both common Lambda path structures
    try:
        from api.healthscribe.router import router as healthscribe_router
    except ImportError:
        from src.api.healthscribe.router import router as healthscribe_router
except Exception as e:
    print(f"CRITICAL IMPORT ERROR: {e}")
    healthscribe_router = None

# 2. THE FIX: Include the router WITHOUT a prefix here
# Because router.py ALREADY has prefix="/healthscribe"
if healthscribe_router:
    app.include_router(healthscribe_router)
    print("✅ HealthScribe Router Loaded")
else:
    print("❌ HealthScribe Router NOT Loaded")

# 3. Request Logging (Check CloudWatch for this!)
@app.middleware("http")
async def debug_paths(request: Request, call_next):
    print(f"DEBUG: Request Path Received -> {request.url.path}")
    return await call_next(request)

@app.get("/")
async def root():
    return {"message": "API is online"}

# 4. Lambda Handler
handler = Mangum(app, lifespan="off")