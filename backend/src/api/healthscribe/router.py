from fastapi import APIRouter, HTTPException, UploadFile, File
from .service import HealthScribeService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/healthscribe", tags=["healthscribe"])
healthscribe_service = HealthScribeService()

class AgentRequest(BaseModel):
    transcript: str
    patient: Optional[dict] = None

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload consultation audio and start HealthScribe job
    """
    try:
        result = await healthscribe_service.process_audio(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/status/{job_name}")
async def get_healthscribe_status(job_name: str):
    """
    Check HealthScribe job status and fetch result when completed
    """
    try:
        result = await healthscribe_service.get_job_result(job_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/agent/analyze")
async def analyze_with_agent(request: AgentRequest):
    """
    Send transcript text to Bedrock Agent
    """
    try:
        result = await healthscribe_service.call_bedrock_agent(
            transcript=request.transcript,
            patient=request.patient
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

