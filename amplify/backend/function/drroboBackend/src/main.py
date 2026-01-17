from fastapi import FastAPI, Request
from api.healthscribe.router import router as healthscribe_router

app = FastAPI(title="Digital Doctor API")

# ✅ Include HealthScribe router 
app.include_router(healthscribe_router)
print("✅ HealthScribe Router Loaded")

# ✅ Request logging middleware (CloudWatch debugging)
@app.middleware("http")
async def debug_paths(request: Request, call_next):
    print(f"DEBUG: Request Path Received -> {request.url.path}")
    return await call_next(request)

# ✅ Health check endpoint
@app.get("/")
async def root():
    return {"message": "API is online"}
