import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import "../styles/tabletTonic.css";

import {
  Send,
  Camera,
  Upload,
  Loader2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Mic,
  Trash2,
  StopCircle,
  FlipHorizontal,
} from "lucide-react";

export default function TabletAndTonicAnalysis() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const recognitionRef = useRef(null);

  const PPLX_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
  const PPLX_URL = "https://api.perplexity.ai/chat/completions";

  // Auto-scroll chat
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Voice recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        sendToPerplexity([{ text: transcript }]);
      };

      recognitionRef.current.onerror = () => {
        setErrorMessage("Speech recognition error.");
        setIsListening(false);
      };
    }
  }, []);

  // Retry fetch (exponential backoff)
  const exponentialBackoffFetch = async (
    url,
    options,
    retries = 3,
    delay = 1000
  ) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(res.status);
      return res;
    } catch {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
      }
      throw new Error("Network error");
    }
  };

  // Format AI response
  const formatResponse = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^## (.*)$/gm, "<h3><u>$1</u></h3>")
      .replace(/\n/g, "<br/>");

  // ---------- MAIN SEND FUNCTION ----------
  const sendToPerplexity = async (parts) => {
    setLoading(true);
    setErrorMessage("");

    setMessages((prev) => [...prev, { sender: "user", parts }]);
    setInput("");

    try {
      const historyMessages = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.parts
          .map((p) => p.text || "[Image]")
          .join("\n"),
      }));

      // 🔥 IMPROVED IMAGE ANALYSIS PROMPT (correct fix)
      const prepared = parts.map((p) =>
        p.text
          ? p.text
          : `
You are a **medical analysis assistant**. The user uploaded a tablet/tonic image. 
Analyze the image and answer in **very simple English**:

1. **Medicine Name (if readable)**  
2. **Short description of the tablet/tonic**  
3. **What it is used for**  
4. **How to use it (general safe dosage)**  
5. **Benefits**  
6. **Common side effects**  
7. **Warnings / when to avoid it**

If the image is unclear, reply: "Image not clear. Please upload a clearer picture."

Image (base64): ${p.inlineData.data}
`
      );

      historyMessages.push({
        role: "user",
        content: prepared.join("\n"),
      });

      const response = await exponentialBackoffFetch(PPLX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PPLX_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: historyMessages,
          max_tokens: 4000,
        }),
      });

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content || "No answer.";
      const formatted = formatResponse(raw);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", parts: [{ html: formatted }] },
      ]);
    } catch (err) {
      setErrorMessage("Failed to reach analysis service.");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", parts: [{ text: "Error fetching response." }] },
      ]);
    }

    setLoading(false);
  };

  // Handle text submit
  const handleAnalyzeText = () => {
    if (input.trim() && !loading) {
      sendToPerplexity([{ text: input }]);
    }
  };

  // Upload → base64 → send
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      sendToPerplexity([
        { inlineData: { mimeType: file.type, data: base64 } },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // Webcam capture
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const base64 = imageSrc.split(",")[1];
    sendToPerplexity([
      { inlineData: { mimeType: "image/jpeg", data: base64 } },
    ]);
    setShowCamera(false);
  };

  // Voice
  const handleVoiceInputStart = () => {
    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleVoiceInputStop = () => {
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const toggleFacingMode = () =>
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));

  const handleClearChat = () => setMessages([]);

  // ---------- UI ----------
  return (
    <div className="analysis-container">
      <div className="analysis-box">
        <h1>
          <MessageSquare size={32} /> Tablet & Tonic Analysis
        </h1>

        {errorMessage && (
          <div className="error-message">
            <AlertTriangle size={20} /> {errorMessage}
          </div>
        )}

        {/* CHAT */}
        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender}`}>
              {msg.parts.map((p, idx) =>
                p.html ? (
                  <div
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: p.html }}
                  />
                ) : (
                  <p key={idx}>{p.text}</p>
                )
              )}
            </div>
          ))}

          {loading && (
            <p className="loading">
              <Loader2 size={18} className="spinner" /> Analyzing...
            </p>
          )}
        </div>

        {/* CAMERA */}
        {showCamera && (
          <div>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode }}
              width="100%"
            />

            <button onClick={capturePhoto}>
              <Camera /> Capture
            </button>

            <button onClick={toggleFacingMode}>
              <FlipHorizontal /> Flip
            </button>

            <button onClick={() => setShowCamera(false)}>
              <XCircle /> Close
            </button>
          </div>
        )}

        {/* INPUT SECTION */}
        {!showCamera && (
          <>
            <textarea
              placeholder="Enter tablet/tonic name, symptoms, or question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <div className="button-group">
              <button onClick={handleAnalyzeText} disabled={loading}>
                <Send /> Send
              </button>

              <button
                onClick={
                  isListening ? handleVoiceInputStop : handleVoiceInputStart
                }
                className={isListening ? "mic-listening" : ""}
              >
                {isListening ? <StopCircle /> : <Mic />} Voice
              </button>

              <button onClick={() => setShowCamera(true)}>
                <Camera /> Capture
              </button>

              <button onClick={() => fileInputRef.current.click()}>
                <Upload /> Upload
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />

              <button onClick={handleClearChat}>
                <Trash2 /> Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
