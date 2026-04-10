# Aro — AI Patient Communication Platform
### HSIL Hackathon 2026 · Harvard T.H. Chan School of Public Health

> *Breaking Communication Barriers — Problem #10*

---

## What It Does

Aro takes a doctor's clinical notes and generates:
- ✅ A warm, multilingual patient explanation
- ✅ Audio narration (text-to-speech) in the patient's language
- ✅ A structured summary (key points, medications, next steps)
- ✅ An interactive Q&A — patients ask follow-up questions, Aro answers

**Languages supported:** English, Spanish, Hindi, French, Mandarin, Arabic, Portuguese, Bengali

---

## Setup — Get Running in 5 Minutes

### Step 1 — Get a Gemini API Key (free)
1. Go to: https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key

---

### Step 2 — Backend (Python / FastAPI)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
# On Mac/Linux:
export GEMINI_API_KEY=your_key_here

# On Windows:
set GEMINI_API_KEY=your_key_here

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### Step 3 — Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Start the app
npm start
```

Frontend runs at: http://localhost:3000

---

## How to Demo

1. Open http://localhost:3000
2. On the **Doctor Input** tab:
   - Enter a patient name
   - Select output language (try **Spanish** or **Hindi**)
   - Select literacy level (**Simple** is best for demo)
   - Click one of the **example chips** (Diabetes / Hypertension / Post Surgery)
   - Click **✨ Generate Patient Explanation**
3. Switch to the **Patient View** tab:
   - Read the multilingual explanation
   - Click **▶ Listen** to hear the audio
   - Check the summary card (key points, medications, next steps)
   - Ask a follow-up question in the chat
   - Click **▶ Listen** on the AI answer

---

## Project Structure

```
aro/
├── backend/
│   ├── main.py              # FastAPI app — all endpoints
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js           # Full React app (Doctor + Patient views)
        ├── App.css          # All styles
        └── index.js         # Entry point
```

---

## API Endpoints

| Method | Endpoint     | Description                            |
|--------|--------------|----------------------------------------|
| POST   | `/explain`   | Generate patient explanation + audio   |
| POST   | `/ask`       | Patient Q&A — answer a follow-up       |
| POST   | `/translate` | Translate any text + generate audio    |
| GET    | `/languages` | List supported languages               |
| GET    | `/health`    | Health check                           |

---

## Tech Stack

| Layer       | Tech                                  |
|-------------|---------------------------------------|
| AI          | Google Gemini 1.5 Flash               |
| TTS Audio   | gTTS (Google Text-to-Speech)          |
| Backend     | FastAPI + Python                      |
| Frontend    | React 18                              |
| Styling     | Custom CSS (no framework needed)      |

---

## Built by Team Aro
HSIL Hackathon · Boston · April 10–11, 2026
