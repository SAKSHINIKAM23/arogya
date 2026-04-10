from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from gtts import gTTS
import base64
import io
import os
import json

app = FastAPI(title="Aro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Configure Gemini ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# ── Language map ──────────────────────────────────────────────────────────────
LANGUAGES = {
    "English":    "en",
    "Spanish":    "es",
    "Hindi":      "hi",
    "French":     "fr",
    "Mandarin":   "zh",
    "Arabic":     "ar",
    "Portuguese": "pt",
    "Bengali":    "bn",
}

# ── Request / Response models ─────────────────────────────────────────────────
class ExplainRequest(BaseModel):
    clinical_input: str          # Doctor's raw notes
    patient_name: str = "Patient"
    language: str = "English"
    literacy_level: str = "simple"  # simple | moderate | detailed

class QARequest(BaseModel):
    question: str
    context: str                 # The original explanation text
    language: str = "English"
    literacy_level: str = "simple"

class TranslateRequest(BaseModel):
    text: str
    target_language: str

# ── Helper: text → base64 audio ───────────────────────────────────────────────
def text_to_audio_b64(text: str, lang_code: str) -> str:
    try:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception:
        return ""

# ── Helper: build explanation prompt ─────────────────────────────────────────
def build_explain_prompt(clinical_input: str, patient_name: str,
                          language: str, literacy_level: str) -> str:
    level_guide = {
        "simple":   "Use very simple words. Avoid all medical jargon. Like explaining to a 10-year-old.",
        "moderate": "Use plain language. Define any medical terms you use.",
        "detailed": "You can use medical terms but explain each one clearly.",
    }
    return f"""
You are Aro, a compassionate AI health communicator. Your job is to explain
a patient's medical situation in a clear, warm, reassuring way.

PATIENT NAME: {patient_name}
LANGUAGE: {language}
LITERACY LEVEL: {level_guide.get(literacy_level, level_guide['simple'])}

DOCTOR'S CLINICAL INPUT:
{clinical_input}

YOUR TASK:
1. Write a warm, clear explanation for the patient in {language}.
2. Structure it as:
   - greeting (1 sentence)
   - what is happening with their health (2-3 sentences)
   - what the treatment/next steps are (2-3 sentences)
   - one encouraging closing sentence
3. Then provide a JSON summary at the end in this exact format:
   ###JSON###
   {{
     "title": "short title for this explanation",
     "key_points": ["point 1", "point 2", "point 3"],
     "medications": ["med1 - why", "med2 - why"],
     "next_steps": ["step 1", "step 2"],
     "follow_up": "when to follow up or call doctor"
   }}

Write the patient explanation FIRST, then the JSON block.
"""

# ── Endpoint: Generate explanation ───────────────────────────────────────────
@app.post("/explain")
async def explain(req: ExplainRequest):
    try:
        prompt = build_explain_prompt(
            req.clinical_input, req.patient_name,
            req.language, req.literacy_level
        )
        response = model.generate_content(prompt)
        full_text = response.text

        # Split explanation from JSON summary
        explanation_text = full_text
        summary = {}
        if "###JSON###" in full_text:
            parts = full_text.split("###JSON###")
            explanation_text = parts[0].strip()
            try:
                summary = json.loads(parts[1].strip())
            except Exception:
                summary = {}

        # Generate audio
        lang_code = LANGUAGES.get(req.language, "en")
        audio_b64 = text_to_audio_b64(explanation_text, lang_code)

        return {
            "explanation": explanation_text,
            "summary": summary,
            "audio_base64": audio_b64,
            "language": req.language,
            "lang_code": lang_code,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint: Patient Q&A ─────────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: QARequest):
    try:
        level_guide = {
            "simple":   "Use very simple, friendly language.",
            "moderate": "Use plain language.",
            "detailed": "Be thorough and clear.",
        }
        prompt = f"""
You are Aro, a compassionate AI health assistant. A patient has a question
about their medical explanation. Answer warmly and clearly in {req.language}.
{level_guide.get(req.literacy_level, '')}

ORIGINAL EXPLANATION CONTEXT:
{req.context}

PATIENT'S QUESTION:
{req.question}

Answer in 2-4 sentences. Be reassuring and helpful. Do NOT give new diagnoses.
If the question is outside the context, say "Please ask your doctor about this."
"""
        response = model.generate_content(prompt)
        answer = response.text.strip()

        lang_code = LANGUAGES.get(req.language, "en")
        audio_b64 = text_to_audio_b64(answer, lang_code)

        return {
            "answer": answer,
            "audio_base64": audio_b64,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint: Translate ───────────────────────────────────────────────────────
@app.post("/translate")
async def translate(req: TranslateRequest):
    try:
        prompt = f"""Translate the following text to {req.target_language}.
Return ONLY the translated text, nothing else.

TEXT:
{req.text}"""
        response = model.generate_content(prompt)
        translated = response.text.strip()
        lang_code = LANGUAGES.get(req.target_language, "en")
        audio_b64 = text_to_audio_b64(translated, lang_code)
        return {"translated_text": translated, "audio_base64": audio_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint: Health check ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "Aro backend is running", "version": "1.0.0"}


# ── Endpoint: Languages list ──────────────────────────────────────────────────
@app.get("/languages")
async def get_languages():
    return {"languages": list(LANGUAGES.keys())}
