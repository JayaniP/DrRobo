import boto3
import json
import uuid
import os
import time
import re
from fastapi import UploadFile
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from typing import Optional, Union  

load_dotenv()

class HealthScribeService:
    def __init__(self):
        # Using a fallback to ensure it doesn't crash if env vars are missing
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.transcribe = boto3.client("transcribe", region_name=self.region)
        self.s3 = boto3.client("s3", region_name=self.region)
        
        # This should match your Amplify storage or manual bucket
        self.bucket = os.getenv("HEALTHSCRIBE_BUCKET", "ia-digital-doctor-scribe")
        self.scribe_role_arn = os.getenv("HEALTHSCRIBE_ROLE_ARN")

    async def process_audio(self, audio_file: UploadFile):
        """Uploads audio to S3 and starts a HealthScribe Job."""
        try:
            audio_bytes = await audio_file.read()
            timestamp = int(time.time())
            # Clean filename to avoid S3 key issues
            safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '_', audio_file.filename)
            s3_key = f"healthscribe/input/{timestamp}_{safe_filename}"

            # 1. Upload to S3
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=audio_bytes,
                ContentType=audio_file.content_type or "audio/webm"
            )

            # 2. Start HealthScribe Job
            job_name = f"drrobo-{timestamp}-{str(uuid.uuid4())[:8]}"
            
            self.transcribe.start_medical_scribe_job(
                MedicalScribeJobName=job_name,
                Media={"MediaFileUri": f"s3://{self.bucket}/{s3_key}"},
                OutputBucketName=self.bucket,
                DataAccessRoleArn=self.scribe_role_arn,
                Settings={
                    "ShowSpeakerLabels": True,
                    "MaxSpeakerLabels": 2,
                }
            )

            return {
                "status": "IN_PROGRESS", 
                "jobName": job_name, 
                "s3Key": s3_key
            }
        except Exception as e:
            print(f"❌ HealthScribe Start Error: {str(e)}")
            return {"status": "FAILED", "error": str(e)}

    async def get_job_result(self, job_name: str):
        """Polls the job status and fetches JSON from S3 if completed."""
        try:
            response = self.transcribe.get_medical_scribe_job(MedicalScribeJobName=job_name)
            job = response["MedicalScribeJob"]
            status = job["MedicalScribeJobStatus"]

            if status == "COMPLETED":
                # HealthScribe puts the output in a folder named after the job
                output_uri = job["MedicalScribeOutput"]["ClinicalDocumentUri"]
                # Extract bucket and key from s3://bucket/key
                path_parts = output_uri.replace("s3://", "").split("/", 1)
                
                # Fetch the JSON result
                s3_response = self.s3.get_object(Bucket=path_parts[0], Key=path_parts[1])
                raw_data = json.loads(s3_response["Body"].read().decode("utf-8"))
                
                return {
                    "status": "COMPLETED",
                    "payload": self.normalize_healthscribe_output(raw_data)
                }
            
            return {"status": status}
        except Exception as e:
            return {"status": "FAILED", "error": str(e)}

    async def call_bedrock_agent(self, transcript: str, patient: Optional[dict] = None):
        """Sends transcript to Bedrock Agent for medical analysis."""
        bedrock_agent = boto3.client("bedrock-agent-runtime", region_name=self.region)
        
        # FIX 1: Ensure you remove "VITE_" prefix if you haven't renamed them in AWS Console
        agent_id = os.getenv("BEDROCK_AGENT_ID")
        agent_alias_id = os.getenv("BEDROCK_AGENT_ALIAS_ID")

        prompt = f"Patient context: {json.dumps(patient) if patient else 'None'}. Transcript: {transcript}"

        try:
            response = bedrock_agent.invoke_agent(
                agentId=agent_id,
                agentAliasId=agent_alias_id,
                sessionId=str(uuid.uuid4()),
                inputText=prompt
            )

            completion = ""
            for event in response.get("completion", []):
                if "chunk" in event:
                    completion += event["chunk"]["bytes"].decode("utf-8")

            # FIX 2: Better JSON extraction
            json_match = re.search(r'\{.*\}', completion, re.DOTALL)
            if json_match:
                try:
                    parsed_json = json.loads(json_match.group())
                    # Add the raw text to the object just in case we need it
                    parsed_json["raw_text"] = completion 
                    return parsed_json
                except json.JSONDecodeError:
                    pass # Fall through to the raw_text return
            
            # FIX 3: Structured Fallback 
            # (This ensures the frontend mapper sees 'diagnosis' and doesn't show a blank screen)
            return {
                "raw_text": completion,
                "diagnosis": {
                    "primary": {
                        "condition": "Manual Review Required",
                        "confidence": 0.5,
                        "rationale": "The AI provided an unstructured response. Please see raw text."
                    }
                }
            }

        except Exception as e:
            print(f"⚠️ Bedrock Agent Error: {e}")
            return {
                "error": str(e),
                "diagnosis": {
                    "primary": {
                        "condition": "System Error",
                        "confidence": 0,
                        "rationale": "Check AWS Lambda logs for Agent ID validation."
                    }
                }
            }

    def normalize_healthscribe_output(self, raw_output: dict):
        """Extracts text from the complex HealthScribe JSON."""
        return {
            "summary": raw_output.get("ClinicalDocumentation", {}).get("Summary", {}).get("Text", ""),
            "transcript": raw_output.get("Transcript", {}).get("TranscriptText", ""),
            # Add more specific SOAP sections if needed
        }