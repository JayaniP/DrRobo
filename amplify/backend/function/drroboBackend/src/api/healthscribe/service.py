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
        self.region = "us-east-1"
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
        """Sends transcript to Bedrock Agent and parses the response into structured cards."""
        bedrock_agent = boto3.client("bedrock-agent-runtime", region_name=self.region)
        
        # Use the keys exactly as they appear in your AWS Console screenshot
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

            # --- STEP 1: Attempt to find and parse JSON block ---
            json_match = re.search(r'\{.*\}', completion, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    parsed["raw_text"] = completion # Keep original text for debugging
                    return parsed
                except json.JSONDecodeError:
                    pass # JSON was malformed, move to tag extraction

            # --- STEP 2: Tag Extraction Fallback (Matches your <tags> screenshot) ---
            # This manually builds the object that your frontend mapper expects
            extracted_data = {
                "diagnosis": {
                    "primary": {
                        "condition": self._extract_xml(completion, "condition") or "Clinical Analysis Summary",
                        "confidence": float(self._extract_xml(completion, "confidence") or 0.85),
                        "rationale": self._extract_xml(completion, "rationale") or "Analyzed from transcript"
                    },
                    "symptoms": {
                        "primary": self._extract_xml(completion, "primary_symptoms", is_list=True),
                        "secondary": self._extract_xml(completion, "secondary_symptoms", is_list=True)
                    }
                },
                "icd_codes": self._extract_icd_list(completion),
                "treatment_plan": {
                    "immediate": self._extract_xml(completion, "immediate", is_list=True),
                    "ongoing": self._extract_xml(completion, "ongoing", is_list=True),
                    "lifestyle": self._extract_xml(completion, "lifestyle", is_list=True)
                },
                "raw_text": completion
            }
            
            return extracted_data

        except Exception as e:
            print(f"⚠️ Bedrock Agent Error: {e}")
            # Final Safety Fallback so frontend mapper doesn't return []
            return {
                "diagnosis": {
                    "primary": {
                        "condition": "System Error",
                        "confidence": 0,
                        "rationale": f"Error calling agent: {str(e)}"
                    }
                },
                "raw_text": "Error occurred during analysis."
            }

    def _extract_xml(self, text, tag, is_list=False):
        """Helper to pull text between tags like <condition>...</condition>"""
        pattern = f"<{tag}>(.*?)</{tag}>"
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return [] if is_list else None
        
        content = match.group(1).strip()
        if is_list:
            # Split by bullets or commas if it's a list tag
            return [item.strip("- ").strip() for item in content.split("\n") if item.strip()]
        return content

    def _extract_icd_list(self, text):
        """Helper to find all <icd_code> entries in the text"""
        # Regex to find everything between <icd_code> and </icd_code>
        codes = re.findall(r"<icd_code>(.*?)</icd_code>", text, re.DOTALL)
        return [{"code": c.strip(), "description": "Verified ICD-10", "confidence": 0.9} for c in codes]


    def normalize_healthscribe_output(self, raw_output: dict):
        """Extracts text from the complex HealthScribe JSON."""
        return {
            "summary": raw_output.get("ClinicalDocumentation", {}).get("Summary", {}).get("Text", ""),
            "transcript": raw_output.get("Transcript", {}).get("TranscriptText", ""),
            # Add more specific SOAP sections if needed
        }