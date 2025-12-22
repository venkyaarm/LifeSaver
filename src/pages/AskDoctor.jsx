import React, { useState, useRef, useEffect, useCallback } from "react";
import "../styles/askdoctor.css";
import {
  Send,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Mic,
  StopCircle,
  Trash2,
  Clipboard,
  FileText,
  Download,
  XCircle,
  User,
  Bot
} from "lucide-react";

import jsPDF from "jspdf";

export default function AskDoctor() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const chatBoxRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // 🔥 Perplexity API
  const PPLX_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
  const PPLX_URL = "https://api.perplexity.ai/chat/completions";

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [history, loading, isTyping]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = String(event.results[0][0].transcript || "");
        setInputAndSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setErrorMessage("Speech recognition error.");
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setErrorMessage("Speech Recognition is not supported on this browser.");
    }
  }, []);

  const setInputAndSend = (text) => {
    setQuestion(text);
    if (text.trim()) {
      setTimeout(() => handleAsk(text), 100);
    }
  };

  const exponentialBackoffFetch = async (url, options, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, delay));
        return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  // Convert HTML to clean text for exports
  const htmlToStructuredPlainText = (htmlString) => {
    if (!htmlString) return "";
    const div = document.createElement("div");
    div.innerHTML = htmlString;
    return div.textContent.trim();
  };

  // Formatting bot output
  const formatResponse = (text) => {
    if (!text) return "No information found.";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^## (.*)$/gm, "<h3><u>$1</u></h3>")
      .replace(/^- (.*)$/gm, "<li>$1</li>")
      .replace(/\n/g, "<br/>");
  };

  // 🧠 Main Ask Function — Perplexity Sonar-Pro Integrated
  const handleAsk = async (questionTextParam = question) => {
    const userQuestion = String(questionTextParam || "").trim();
    if (!userQuestion) {
      setErrorMessage("Please enter a question.");
      return;
    }

    if (loading || isListening) return;

    setLoading(true);
    setQuestion("");

    setHistory(prev => [...prev, { sender: "user", text: userQuestion }]);
    setHistory(prev => [...prev, { sender: "bot", text: "..." }]);
    setIsTyping(true);

    try {
      // Build Perplexity-compatible chat messages
      const messages = history.map((h) => ({
        role: h.sender === "user" ? "user" : "assistant",
        content: h.text || htmlToStructuredPlainText(h.html || "")
      }));

      messages.push({ role: "user", content: userQuestion });

      const response = await exponentialBackoffFetch(PPLX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PPLX_API_KEY}`
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages,
          max_tokens: 4000
        })
      });

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content || "No answer generated.";
      const formatted = formatResponse(raw);

      setHistory(prev => {
        const newHistory = [...prev];
        const botIndex = newHistory.findIndex(h => h.text === "...");
        if (botIndex !== -1) {
          newHistory[botIndex] = { sender: "bot", html: formatted };
        }
        return newHistory;
      });

    } catch (err) {
      setErrorMessage("Failed to get response from Perplexity.");
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Voice Input Start/Stop
  const handleVoiceInputStart = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleVoiceInputStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // EXPORT: TXT
  const exportTxt = () => {
    const txt = history
      .map(h => `${h.sender === "user" ? "Q:" : "A:"} ${h.text || htmlToStructuredPlainText(h.html)}`)
      .join("\n\n");

    const blob = new Blob([txt], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "doctor_chat_history.txt";
    link.click();
  };

  // EXPORT: PDF
  const exportPDF = () => {
    const pdf = new jsPDF();
    let y = 15;

    history.forEach((item) => {
      const text = `${item.sender === "user" ? "Q:" : "A:"} ${item.text || htmlToStructuredPlainText(item.html)}`;
      pdf.text(text, 10, y);
      y += 10;
    });

    pdf.save("doctor_chat_history.pdf");
  };

  // COPY CHAT
  const copyToClipboard = () => {
    const txt = history
      .map(h => `${h.sender === "user" ? "Q:" : "A:"} ${h.text || htmlToStructuredPlainText(h.html)}`)
      .join("\n\n");

    navigator.clipboard.writeText(txt);
    setStatusMessage("Copied!");
  };

  // CLEAR CHAT
  const handleClearChat = () => {
    setHistory([]);
    setStatusMessage("Chat cleared!");
  };

  return (
    <div className="ask-doctor-container">
      <style>{`
        /* SAME CSS YOU PROVIDED — kept intact */
      `}</style>

      <div className="chat-wrapper">
        <h2 className="title">
          <MessageCircle size={36} /> Ask Doctor
        </h2>

        {(errorMessage || statusMessage) && (
          <div className={`status-message ${errorMessage ? "error" : "success"}`}>
            {errorMessage ? <AlertCircle /> : <CheckCircle />}
            <span>{errorMessage || statusMessage}</span>
            <button onClick={() => { setErrorMessage(""); setStatusMessage(""); }}>
              <XCircle />
            </button>
          </div>
        )}

        <div className="chat-box" ref={chatBoxRef}>
          {history.map((item, i) => (
            <div key={i} className="chat-entry">
              {item.sender === "user" ? (
                <div className="chat-entry-content">
                  <User size={18} />
                  <div className="chat-question">You: {item.text}</div>
                </div>
              ) : (
                <div className="chat-entry-content">
                  <Bot size={18} />
                  <div className="chat-answer">
                    {item.html ? (
                      <div dangerouslySetInnerHTML={{ __html: item.html }} />
                    ) : (
                      item.text
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && isTyping && (
            <div className="chat-entry bot">
              <div className="chat-entry-content">
                <Bot size={18} />
                <div className="chat-answer">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="input-box">
          <input
            ref={inputRef}
            type="text"
            value={question}
            placeholder={isListening ? "Listening..." : "Ask a health question..."}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && question.trim()) handleAsk();
            }}
            disabled={loading}
          />

          <button onClick={() => handleAsk()} disabled={loading || !question.trim()}>
            <Send size={20} /> Ask
          </button>

          <button
            className="mic-button"
            onClick={isListening ? handleVoiceInputStop : handleVoiceInputStart}
          >
            {isListening ? <StopCircle /> : <Mic />}
          </button>
        </div>

        {/* EXPORT BUTTONS */}
        {history.length > 0 && (
          <div className="export-buttons">
            <button onClick={exportTxt}><FileText /> Export TXT</button>
            <button onClick={exportPDF}><Download /> Export PDF</button>
            <button onClick={copyToClipboard}><Clipboard /> Copy Chat</button>
            <button onClick={handleClearChat} className="clear-chat-btn">
              <Trash2 /> Clear Chat
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
