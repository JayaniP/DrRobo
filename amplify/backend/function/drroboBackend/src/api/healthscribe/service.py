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
from botocore.config import Config

load_dotenv()

class HealthScribeService:
   def __init__(self):
        # 1. Use standard AWS Lambda env vars first, then VITE fallback
        self.region = os.environ.get("AWS_REGION", os.environ.get("VITE_AWS_REGION", "us-east-1"))
        
        # 2. Initialize clients
        self.transcribe = boto3.client("transcribe", region_name=self.region)
        self.s3 = boto3.client("s3", region_name=self.region)
        self.bedrock_agent = boto3.client("bedrock-agent-runtime", region_name=self.region)
      
        # 3. Environment Variable Mapping
        self.bucket = "ia-digital-doctor-scribe"
        self.scribe_role_arn = os.getenv("VITE_AWS_BC_ARN")
        self.agent_id = os.getenv("VITE_BEDROCK_AGENT_ID")
        self.agent_alias_id = os.getenv("VITE_BEDROCK_AGENT_ALIAS_ID")

    async def process_audio(self, audio_file):
            try:
                audio_bytes = await audio_file.read()
                timestamp = int(time.time())
                s3_key = f"healthscribe/input/{timestamp}.webm"

                self.s3.put_object(
                    Bucket=self.bucket,
                    Key=s3_key,
                    Body=audio_bytes,
                    ContentType="audio/webm"
                )

                job_name = f"healthscribe-{timestamp}"

                SCRIBE_ROLE_ARN = os.getenv("VITE_AWS_BC_ARN")

                self.transcribe.start_medical_scribe_job(
                    MedicalScribeJobName=job_name,
                    Media={"MediaFileUri": f"s3://{self.bucket}/{s3_key}"},
                    OutputBucketName=self.bucket,
                    DataAccessRoleArn=SCRIBE_ROLE_ARN,
                    Settings={
                        "ShowSpeakerLabels": True,
                        "MaxSpeakerLabels": 2,
                        "ChannelDefinitions": [
                            {"ChannelId": 0, "ParticipantRole": "PRIMARY_SPEAKER"}
                        ]
                    }
                )

                return {"status": "started", "jobName": job_name, "s3_path": s3_key}
            except Exception as e:
                print(f"S3/Scribe Error: {str(e)}")
                # For the demo: If Scribe fails, don't crash the whole app
                return {"status": "error", "message": str(e), "s3_path": s3_key}


    def extract_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Uses Regex to find the JSON block even if the Agent included conversational text.
        """
        try:
            # Matches everything between the first { and the last }
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            return None
        except Exception as e:
            print(f"Regex JSON Extract Error: {e}")
            return None


    async def call_bedrock_agent(self, transcript: str, patient: dict | None = None):
        # Generate a unique session ID for every call
        session_id = str(uuid.uuid4())
        
        # 4. STRONG PROMPT: Force JSON and tell the Agent NOT to talk
        prompt = (
            f"TRANSCRIPT: {transcript}\n\n"
            f"TASK: Analyze the transcript and return ONLY a JSON object. "
            f"DO NOT include any text before or after the JSON."
        )

        try:
            response = self.bedrock_agent.invoke_agent(
                agentId=self.agent_id,
                agentAliasId=self.agent_alias_id,
                sessionId=session_id,
                inputText=prompt
            )

            completion = ""
            for event in response.get("completion", []):
                if "chunk" in event:
                    completion += event["chunk"]["bytes"].decode("utf-8")

            print(f"RAW AGENT OUTPUT (PROD): {completion}")

            # 5. USE THE REGEX EXTRACTOR (Much safer for Production)
            parsed_data = self.extract_json_from_text(completion)
            
            if parsed_data:
                return parsed_data
            
            raise ValueError("Agent response contained no valid JSON structure.")

        except Exception as e:
            print(f"Agent Execution/Parsing Failed: {e}")
            # 6. HARDENED FALLBACK (Matches your React UI expectations)
            return {
                "diagnosis": {
                    "primary": {"condition": "Analysis Error", "confidence": 0, "rationale": str(e)},
                    "symptoms": {"primary": [], "secondary": []}
                },
                "icd_codes": [],
                "safety": {"red_flags": ["System was unable to parse AI response"], "contraindications_found": []},
                "treatment_plan": {"immediate": ["Please review raw logs"], "ongoing": [], "lifestyle": []},
                "follow_ups": []
            }

    def normalize_healthscribe_output(self, raw_output: dict):
            """
            Convert AWS HealthScribe output into clean SOAP notes
            """
            clinical_notes = raw_output.get("ClinicalNotes", {})
            transcript = raw_output.get("Transcript", {})

            return {
                "summary": clinical_notes.get("Summary", ""),
                "subjective": clinical_notes.get("Subjective", ""),
                "objective": clinical_notes.get("Objective", ""),
                "assessment": clinical_notes.get("Assessment", ""),
                "plan": clinical_notes.get("Plan", ""),
                "fullTranscript": transcript.get("TranscriptText", "")
            }