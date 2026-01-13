import os
from fastapi import FastAPI, Request
from mangum import Mangum

# 1. Lean Import of HealthScribe Router
try:
    from src.api.healthscribe.router import router as healthscribe_router
except ImportError:
    print("CRITICAL: HealthScribe router could not be imported.")
    healthscribe_router = None

# 2. Initialize FastAPI
# We set root_path to None initially; Mangum will handle path stripping
app = FastAPI(
    title="Digital Doctor API",
    docs_url="/docs",  # Keeping docs enabled for 1 more test to verify 404
    redoc_url=None
)

# 3. DEBUG MIDDLEWARE (Check CloudWatch to see why it 404s)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path
    print(f"DEBUG: FastAPI receiving request at: {path}")
    response = await call_next(request)
    return response

# 4. Include the Router
# Ensure this matches your React call: /healthscribe/agent/analyze
if healthscribe_router:
    app.include_router(healthscribe_router)
else:
    print("WARNING: healthscribe_router is None")

# 5. Base Routes
@app.get("/")
async def root():
    return {"status": "online", "message": "Digital Doctor API"}

@app.get("/healthcheck")
async def healthcheck():
    return {"status": "healthy"}

# 6. PRODUCTION HANDLER (Fixed for Function URLs)
# lifespan="off" prevents startup timeouts in Lambda
handler = Mangum(app, lifespan="off")