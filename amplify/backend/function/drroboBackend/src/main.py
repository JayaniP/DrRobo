import os
from fastapi import FastAPI
from mangum import Mangum

# 1. OPTIONAL: Keep router import lean
try:
    from src.api.healthscribe.router import router as healthscribe_router
except ImportError:
    healthscribe_router = None

# 2. Production App Configuration
# 'docs_url=None' disables the /docs in production for security. 
# Remove 'docs_url=None' if you still need to see Swagger in production.
app = FastAPI(
    title="Digital Doctor API",
    docs_url=None, 
    redoc_url=None
)

# 3. CORS REMOVAL (Handle this in AWS API Gateway Console instead)
# We have removed CORSMiddleware here to let AWS infrastructure handle it.

# 4. Include Routers
if healthscribe_router:
    app.include_router(healthscribe_router)

# 5. Production Endpoints
@app.get("/")
async def root():
    return {"message": "Digital Doctor API Production Ready"}

@app.get("/healthcheck")
async def healthcheck():
    # You can add DB or AWS Service checks here later
    return {"status": "healthy", "version": "1.0.0"}

# 6. AWS LAMBDA HANDLER
# 'lifespan="off"' speeds up cold starts in Lambda
handler = Mangum(app, lifespan="off")