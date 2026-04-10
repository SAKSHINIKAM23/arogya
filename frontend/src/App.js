import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:8000";

const LANGUAGES = ["English","Spanish","Hindi","French","Mandarin","Arabic","Portuguese","Bengali"];
const LEVELS    = [
  { value: "simple",   label: "Simple — easy words" },
  { value: "moderate", label: "Moderate — some terms" },
  { value: "detailed", label: "Detailed — clinical level" },
];

// ── Small components ──────────────────────────────────────────────────────────

function Spinner() {
  return <div className="spinner" />;
}

function AudioPlayer({ base64Audio, label = "Listen" }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (base64Audio && audioRef.current) {
      audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`;
    }
  }, [base64Audio]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  return (
    <div className="audio-row">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
      <button className={`btn-audio ${playing ? "playing" : ""}`} onClick={toggle}>
        {playing ? "⏸ Pause" : "▶ " + label}
      </button>
    </div>
  );
}

function SummaryCard({ summary }) {
  if (!summary || !summary.title) return null;
  return (
    <div className="summary-card">
      <h3>📋 {summary.title}</h3>
      {summary.key_points?.length > 0 && (
        <div className="summary-section">
          <strong>Key Points</strong>
          <ul>{summary.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}
      {summary.medications?.length > 0 && (
        <div className="summary-section">
          <strong>💊 Medications</strong>
          <ul>{summary.medications.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
      {summary.next_steps?.length > 0 && (
        <div className="summary-section">
          <strong>✅ Next Steps</strong>
          <ul>{summary.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {summary.follow_up && (
        <div className="summary-section follow-up">
          <strong>📅 Follow-up:</strong> {summary.follow_up}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab]               = useState("doctor");   // doctor | patient
  const [clinicalInput, setClinical] = useState("");
  const [patientName, setName]       = useState("");
  const [language, setLanguage]      = useState("English");
  const [literacy, setLiteracy]      = useState("simple");
  const [loading, setLoading]        = useState(false);
  const [result, setResult]          = useState(null);
  const [error, setError]            = useState("");

  // Q&A state
  const [question, setQuestion]      = useState("");
  const [qaLoading, setQaLoading]    = useState(false);
  const [qaHistory, setQaHistory]    = useState([]);

  const generate = async () => {
    if (!clinicalInput.trim()) { setError("Please enter clinical notes."); return; }
    setError(""); setLoading(true); setResult(null); setQaHistory([]);
    try {
      const { data } = await axios.post(`${API}/explain`, {
        clinical_input: clinicalInput,
        patient_name:   patientName || "Patient",
        language,
        literacy_level: literacy,
      });
      setResult(data);
      setTab("patient");
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || !result) return;
    const q = question.trim();
    setQuestion(""); setQaLoading(true);
    try {
      const { data } = await axios.post(`${API}/ask`, {
        question: q,
        context:  result.explanation,
        language,
        literacy_level: literacy,
      });
      setQaHistory(prev => [...prev, { q, a: data.answer, audio: data.audio_base64 }]);
    } catch (e) {
      setQaHistory(prev => [...prev, { q, a: "Sorry, I couldn't answer that. Please ask your doctor.", audio: "" }]);
    } finally {
      setQaLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askQuestion(); }
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-text">Aro</span>
            <span className="logo-tag">AI Patient Communication</span>
          </div>
          <div className="header-badge">HSIL Hackathon 2026</div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="tab-bar">
        <button className={`tab ${tab === "doctor" ? "active" : ""}`} onClick={() => setTab("doctor")}>
          🩺 Doctor Input
        </button>
        <button
          className={`tab ${tab === "patient" ? "active" : ""}`}
          onClick={() => setTab("patient")}
          disabled={!result}
        >
          👤 Patient View
        </button>
      </div>

      <main className="main">

        {/* ══ DOCTOR TAB ══════════════════════════════════════════════════ */}
        {tab === "doctor" && (
          <div className="panel doctor-panel">
            <div className="panel-header">
              <h2>Clinical Input</h2>
              <p>Enter your clinical notes and Aro will generate a patient-friendly explanation.</p>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Patient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={patientName}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Output Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              <div className="field field-full">
                <label>Literacy Level</label>
                <div className="literacy-buttons">
                  {LEVELS.map(lv => (
                    <button
                      key={lv.value}
                      className={`literacy-btn ${literacy === lv.value ? "active" : ""}`}
                      onClick={() => setLiteracy(lv.value)}
                    >
                      {lv.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field field-full">
                <label>Clinical Notes</label>
                <textarea
                  rows={7}
                  placeholder={`Enter clinical notes here...\n\nExample:\nPatient has been diagnosed with Type 2 Diabetes. HbA1c is 8.2%. Prescribing Metformin 500mg twice daily with meals. Patient should monitor blood sugar morning and night. Follow up in 3 months. Recommend low-sugar diet and 30 min walking daily.`}
                  value={clinicalInput}
                  onChange={e => setClinical(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button className="btn-generate" onClick={generate} disabled={loading}>
              {loading ? <><Spinner /> Generating...</> : "✨ Generate Patient Explanation"}
            </button>

            {/* Demo examples */}
            <div className="examples">
              <p className="examples-label">Try an example:</p>
              <div className="example-chips">
                {[
                  {
                    label: "Diabetes",
                    text: "Patient diagnosed with Type 2 Diabetes. HbA1c 8.2%. Starting Metformin 500mg twice daily. Monitor blood sugar morning and night. Low-sugar diet, 30 min walk daily. Follow up in 3 months."
                  },
                  {
                    label: "Hypertension",
                    text: "Patient has high blood pressure, 158/95 mmHg. Prescribing Lisinopril 10mg once daily. Reduce salt intake, avoid stress, exercise 3x per week. Return in 6 weeks for recheck."
                  },
                  {
                    label: "Post Surgery",
                    text: "Patient had appendectomy yesterday. Discharged with Amoxicillin 500mg 3x daily for 7 days and Ibuprofen for pain. Keep wound dry for 48 hours. No heavy lifting for 2 weeks. Come back if fever above 38°C."
                  },
                ].map(ex => (
                  <button key={ex.label} className="chip" onClick={() => setClinical(ex.text)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ PATIENT TAB ═════════════════════════════════════════════════ */}
        {tab === "patient" && result && (
          <div className="panel patient-panel">

            {/* Language badge */}
            <div className="lang-badge">🌐 {result.language}</div>

            {/* Explanation card */}
            <div className="explanation-card">
              <div className="explanation-header">
                <h2>Your Health Explanation</h2>
                <AudioPlayer base64Audio={result.audio_base64} label="Listen to explanation" />
              </div>
              <div className="explanation-text">
                {result.explanation.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Summary */}
            <SummaryCard summary={result.summary} />

            {/* Q&A Section */}
            <div className="qa-section">
              <h3>💬 Have a question? Ask Aro</h3>
              <p className="qa-hint">You can ask anything about your explanation in any language.</p>

              {/* Chat history */}
              <div className="chat-history">
                {qaHistory.length === 0 && (
                  <div className="chat-empty">No questions yet — ask anything below!</div>
                )}
                {qaHistory.map((item, i) => (
                  <div key={i} className="chat-pair">
                    <div className="chat-q">
                      <span className="chat-avatar">👤</span>
                      <span>{item.q}</span>
                    </div>
                    <div className="chat-a">
                      <span className="chat-avatar">🤖</span>
                      <div>
                        <span>{item.a}</span>
                        {item.audio && <AudioPlayer base64Audio={item.audio} label="Listen" />}
                      </div>
                    </div>
                  </div>
                ))}
                {qaLoading && (
                  <div className="chat-a"><span className="chat-avatar">🤖</span><Spinner /></div>
                )}
              </div>

              {/* Input */}
              <div className="qa-input-row">
                <input
                  type="text"
                  placeholder="Ask a question about your explanation..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={qaLoading}
                />
                <button className="btn-ask" onClick={askQuestion} disabled={qaLoading || !question.trim()}>
                  {qaLoading ? <Spinner /> : "Ask →"}
                </button>
              </div>
            </div>

            {/* Back button */}
            <button className="btn-back" onClick={() => setTab("doctor")}>
              ← Back to Doctor Input
            </button>
          </div>
        )}

      </main>

      <footer className="footer">
        Aro — HSIL Hackathon 2026 · Harvard T.H. Chan School of Public Health · Built with Gemini AI
      </footer>
    </div>
  );
}
