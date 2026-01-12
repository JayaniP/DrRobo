from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from .service import HealthScribeService
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

# Define the router with metadata for the API docs
router = APIRouter(prefix="/healthscribe", tags=["HealthScribe & AI Agent"])

# Dependency to get the service instance
def get_service():
    return HealthScribeService()

class PatientContext(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    history: Optional[str] = None

class AgentRequest(BaseModel):
    transcript: str = Field(..., description="The medical transcript text to analyze")
    patient: Optional[Dict[str, Any]] = Field(None, description="Optional patient metadata")

@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...), 
    service: HealthScribeService = Depends(get_service)
):
    """
    1. Upload consultation audio to S3.
    2. Start an AWS HealthScribe job.
    """
    try:
        # Validate file type
        if not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be an audio format.")
            
        result = await service.process_audio(file)
        return result
    except Exception as e:
        print(f"Error in /upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_name}")
async def get_healthscribe_status(
    job_name: str, 
    service: HealthScribeService = Depends(get_service)
):
    """
    Check if HealthScribe is done. 
    Returns the transcript and clinical notes if COMPLETED.
    """
    try:
        result = await service.get_job_result(job_name)
        return result
    except Exception as e:
        print(f"Error in /status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent/analyze")
async def analyze_with_agent(
    request: AgentRequest, 
    service: HealthScribeService = Depends(get_service)
):
    """
    Sends the finished transcript to a Bedrock Agent for medical reasoning.
    """
    try:
        result = await service.call_bedrock_agent(
            transcript=request.transcript,
            patient=request.patient
        )
        return result
    except Exception as e:
        print(f"Error in /agent/analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))