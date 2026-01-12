# 🏥 Dr. Robo: AI-Powered Clinical Decision Support System

[![AWS](https://img.shields.io/badge/AWS-Powered-orange?logo=amazon-aws)](https://aws.amazon.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Dr. Robo** is a high-fidelity clinical assistant designed to bridge the gap between patient consultations and structured medical documentation. By leveraging **AWS HealthScribe** for medical transcription and **Amazon Bedrock** for clinical reasoning, the system provides real-time ICD-10 mapping, treatment suggestions, and safety red-flag detection.

---

## 📽️ System Architecture
The system utilizes a dual-pipeline approach:
1.  **Asynchronous High-Fidelity Path**: AWS HealthScribe generates official SOAP notes.
2.  **Instant Intelligence Path**: Amazon Bedrock provides real-time clinical extraction and decision support.

---

## ✨ Core Features
* **🎙️ Medical Scribe**: Ingests consultation audio and generates structured SOAP notes.
* **🧬 Clinical Digital Twin**: Integrates with **Amazon DynamoDB** to pull longitudinal patient history (allergies, past medication failures) to personalize AI suggestions.
* **📚 NICE Guideline Grounding**: The Bedrock Agent is grounded in **NICE (UK) clinical guidelines** to ensure evidence-based recommendations.
* **🚨 Red-Flag Detection**: Automatic identification of life-threatening symptoms (Sepsis, MI, etc.) with a high-priority UI warning system.
* **🤝 Human-in-the-Loop (HITL)**: Clinicians can **Approve, Reject, or Modify** any AI-generated suggestion before it enters the final medical record.

---
## 🚀 Future Scalability & Roadmap

To transition from a PoC to a production-grade enterprise platform, the following architectural scaling is planned:

### **1. Clinical Interoperability (HL7 FHIR)**
* **Objective**: Move beyond internal JSON storage to **HL7 FHIR R4** standards.
* **Impact**: Allows Dr. Robo to "plug and play" with major Electronic Health Records (EHR) like **Epic, Cerner, and EMIS**, enabling seamless data exchange across the healthcare ecosystem.

### **2. Multi-Modal Diagnostic Integration**
* **Objective**: Expand the Bedrock Knowledge Base to include **Medical Imaging (PACS)** and **Lab Results**.
* **Impact**: The AI will cross-reference the consultation transcript with the patient's latest blood tests and X-rays to provide a 360-degree diagnostic confidence score.

### **3. Enterprise-Grade Security (Zero Trust)**
* **Objective**: Implement **AWS Cognito Identity Pools** for temporary, scoped-down IAM credentials.
* **Impact**: Removes the need for long-lived secret keys on the client side and introduces **Multi-Factor Authentication (MFA)** for clinicians, meeting HIPAA and GDPR stringent security requirements.

### **4. Edge Deployment for Low-Latency**
* **Objective**: Utilize **AWS Wavelength** or **AWS Outposts** for 5G-enabled edge computing.
* **Impact**: Reduces "Time-to-Suggestion" to sub-500ms, making the AI feel like a real-time participant in the room even in hospitals with limited connectivity.

---
## 🛠️ Technical Stack
### **Backend (Python)**
* **FastAPI**: Orchestrates the AI pipeline.
* **Boto3**: Interfaces with S3, Transcribe, and Bedrock.
* **Pydantic**: Data validation for clinical schemas.

### **Frontend (React)**
* **Tailwind CSS**: Modern, clean clinical dashboard.
* **Shadcn/UI**: High-quality UI components.
* **Lucide React**: Medical-grade iconography.

---
## 📋 API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/healthscribe/upload` | `POST` | Uploads audio and initiates HealthScribe job |
| `/healthscribe/status/{id}`| `GET` | Polls transcription job status |
| `/agent/analyze` | `POST` | Triggers Bedrock Agent clinical reasoning |

---

## 🛡️ Clinical Safety & Ethics

* **Contextual Safety**: The system cross-references new prescriptions against the **Digital Twin** history (e.g., flagging ACE-inhibitor cough history).
* **Non-Autonomous**: The AI *suggests*, but the clinician *validates*.
---

## 🚀 Getting Started

### **1. Prerequisites**
* Python 3.9+
* Node.js 18+
* AWS Account with Bedrock Agent Access

### **2. Installation**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

### ** FrontEnd Installation**
```bash
npm install
npm run dev
