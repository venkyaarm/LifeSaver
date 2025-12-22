import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  FlipHorizontal,
  FileText,
  Upload,
  XCircle,
  Download,
  Copy,
  StopCircle,
} from "lucide-react";

/*
  HealthReportAnalysis (full component)
  - Modes: camera | upload | qr (renamed to Description mode UI   text-only)
  - Capture, Upload, Description(text-only) and Analyze flows included.
  - Minimal changes from your original logic; fixed JSX comment and mode label.
*/

export default function HealthReportAnalysis() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // UI states
  const [scanMode, setScanMode] = useState("camera"); // camera | upload | qr
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [qrScanResult, setQrScanResult] = useState("");
  const [isQrScanning, setIsQrScanning] = useState(false);

  // camera devices and selection
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [cameraStream, setCameraStream] = useState(null);

  // Perplexity config (Client-side)
  const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY; // Add key if available
  const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

  // Debug helper
  const status = (node) => {
    setStatusMessage(node);
    console.log("[HealthReport]", node);
  };

  // ----- DEVICE ENUMERATION -----
  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);

      if (!selectedDeviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("enumerateDevices failed:", err);
      // Don't show error to user immediately, just log it
    }
  };

  useEffect(() => {
    refreshDevices();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- START CAMERA -----
  const startCamera = async (deviceId) => {
    try {
      // Clear any previous image so we see the camera
      setCapturedImage(null);
      setAnalysisResult("");

      // Stop existing stream first
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { video: { facingMode: "environment" }, audio: false };

      status("Starting camera...");

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);
      setIsCameraActive(true);
      setIsVideoReady(false);
      setStatusMessage(null);

      refreshDevices();

    } catch (err) {
      console.error("camera error:", err);
      let msg = `Camera error: ${err.message}`;
      if (err.name === "NotAllowedError") msg = "Permission denied. Allow camera access.";
      else if (err.name === "NotFoundError") msg = "No camera found.";
      status(msg);

      setIsCameraActive(false);
      setIsVideoReady(false);
      setCameraStream(null);
    }
  };

  // ----- ATTACH STREAM -----
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      video.muted = true;
      video.playsInline = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => console.warn("Auto-play prevented:", e));
      }

      video.onloadedmetadata = () => {
        setIsVideoReady(true);
        status("Camera ready.");
      };

      // Fallback: sometimes onloadedmetadata is slow, use oncanplay
      video.oncanplay = () => {
        setIsVideoReady(true);
      };
    }
  }, [isCameraActive, cameraStream]);

  // ----- STOP CAMERA -----
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
    setIsVideoReady(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ----- CAPTURE LOGIC -----
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      status("Camera error: Element missing.");
      return;
    }

    // Even if isVideoReady is false, check if we have data
    if (video.readyState < 2) { // HAVE_CURRENT_DATA = 2
      status("Camera still loading, please wait...");
      return;
    }

    // Set canvas dimensions to match video stream (or fallback to defaults)
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    try {
      ctx.drawImage(video, 0, 0, width, height);

      // Convert to image
      const img = canvas.toDataURL("image/jpeg", 0.9);

      // 1. Set the image state
      setCapturedImage(img);

      // 2. Stop the camera (saves battery)
      stopCamera();

      status("Captured!");
    } catch (e) {
      console.error("Capture failed", e);
      status("Capture failed. Try again.");
    }
  };

  // ----- UPLOAD -----
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const base = await toBase64(file);
      setCapturedImage(base);
      status("Image uploaded.");
      const prompt = `Analyze this medical report image (Base64 encoded):\n\n${base.split(",")[1]}\n\nProvide a structured report.`;
      askPerplexity(prompt);
    } else {
      const text = await file.text();
      status("Text file uploaded.");
      const prompt = `Analyze this text-based health document:\n\n${text}\n\nProvide a structured summary, diagnosis, tips and next steps.`;
      askPerplexity(prompt);
    }
  };

  // ----- PERPLEXITY CALL -----
  const askPerplexity = async (prompt) => {
    // Mock response if no key is provided (for demo purposes)
    if (!PERPLEXITY_API_KEY) {
      setLoading(true);
      setTimeout(() => {
        setAnalysisResult(`
                <h3>Demo Analysis Result</h3>
                <p><strong>Note:</strong> No API Key detected. Using mock data for demonstration.</p>
                <h3>Findings</h3>
                <ul>
                    <li><strong>Blood Pressure:</strong> 120/80 (Normal)</li>
                    <li><strong>Glucose:</strong> 95 mg/dL (Normal)</li>
                    <li><strong>Cholesterol:</strong> Slightly elevated</li>
                </ul>
                <h3>Recommendations</h3>
                <p>Maintain a balanced diet and regular exercise. Consult a physician for the cholesterol levels.</p>
            `);
        setLoading(false);
        status("Analysis complete (Demo Mode).");
      }, 1500);
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setAnalysisResult("");

    try {
      const response = await fetch(PERPLEXITY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Perplexity response not ok:", response.status, text);
        status("Request failed. Check console.");
        setLoading(false);
        return;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "No analysis found.";

      // Basic Markdown formatting to HTML
      const formatted = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^### (.*$)/gim, "<h3><u>$1</u></h3>")
        .replace(/^## (.*$)/gim, "<h3><u>$1</u></h3>")
        .replace(/- (.*)/g, "<li>$1</li>")
        .replace(/\n/g, "<br/>");

      setAnalysisResult(formatted);
      status("Analysis complete.");
    } catch (err) {
      console.error("askPerplexity error:", err);
      status(<> <AlertCircle size={16} /> Analysis Error. </>);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = () => {
    if (!capturedImage) {
      status(<> <AlertCircle size={16} /> No image captured. </>);
      return;
    }
    const base64 = capturedImage.split(",")[1];
    const prompt = `
      You are a medical document specialist.
      Analyze this medical report image (Base64 encoded):
      ${base64}
      Generate a professional structured report including:
      1. Person Details, 2. Health Findings, 3. Diagnosis Summary, 
      4. Observations, 5. Health Tips, 6. Warnings, 7. Action Steps.
    `;
    askPerplexity(prompt);
  };

  // ----- EXPORTS & COPY -----
  const exportToTxt = () => {
    const plain = analysisResult.replace(/<[^>]+>/g, "");
    const blob = new Blob([plain], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "health_report.txt";
    a.click();
  };

  const exportToPdf = () => {
    window.print();
  };

  const copyToClipboard = () => {
    const temp = document.createElement("div");
    temp.innerHTML = analysisResult;
    const plain = temp.innerText;
    navigator.clipboard.writeText(plain);
    status(<> <CheckCircle size={16} /> Copied! </>);
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // ----- QR scanning (kept in code but Description mode will not show camera UI) -----
  useEffect(() => {
    let detector = null;
    let rafId = null;

    const runScan = async () => {
      if (!isQrScanning || !videoRef.current || !isCameraActive) return;

      // Native BarcodeDetector (Chrome/Edge/Android)
      if ("BarcodeDetector" in window) {
        try {
          if (!detector) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const results = await detector.detect(videoRef.current);
          if (results.length > 0) {
            setQrScanResult(results[0].rawValue);
            setIsQrScanning(false);
            status(<> <CheckCircle size={16} /> QR Detected. </>);
            stopCamera(); // Stop camera on success
            return;
          }
        } catch (e) {
          console.warn("Barcode API error", e);
        }
      }

      if (isQrScanning) rafId = requestAnimationFrame(runScan);
    };

    if (isQrScanning) {
      if (!isCameraActive) startCamera(selectedDeviceId);
      runScan();
    } else {
      if (rafId) cancelAnimationFrame(rafId);
    }

    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [isQrScanning, isCameraActive, selectedDeviceId]);

  const analyzeQrData = () => {
    const q = qrScanResult?.trim();
    if (!q) {
      status(<> <AlertCircle size={16} /> No data to analyze. </>);
      return;
    }
    // Use same analyzer for pasted/typed description text
    askPerplexity(`Analyze the following medical description/text:\n\n${q}\n\nGenerate a structured health report.`);
  };

  // ----- FLIP CAMERA -----
  const flipCamera = () => {
    if (!devices || devices.length <= 1) {
      status("No alternate camera found.");
      return;
    }
    const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const next = devices[(idx + 1) % devices.length] || devices[0];
    setSelectedDeviceId(next.deviceId);
  };

  useEffect(() => {
    if (isCameraActive && selectedDeviceId) {
      startCamera(selectedDeviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  // ----- STYLES (Enhanced CSS) -----
  const styles = `
    /* Reset and Base Styles */
    * {
      box-sizing: border-box;
    }
    
    .analysis-container {
      width: 1520px;
      margin: auto;
      padding: 20px;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
      min-height: 100vh;
    }
    
    .report-analysis-box {
    width: 1200px;
      background: white;
      border-radius: 20px;
      box-shadow: 
        0 10px 40px rgba(0, 0, 0, 0.08),
        0 2px 15px rgba(0, 0, 0, 0.03);
      padding: 50px;
      padding-left: 100px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      margin-left: 200px;
    }
    
    .report-analysis-box:hover {
      box-shadow: 
        0 15px 50px rgba(0, 0, 0, 0.12),
        0 3px 20px rgba(0, 0, 0, 0.05);
    }
    
    /* Header */
    h1 {
      font-size: 28px;
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0 0 32px 0;
      color: #1a365d;
      font-weight: 700;
      position: relative;
      padding-bottom: 16px;
    }
    
    h1:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 60px;
      height: 4px;
      background: linear-gradient(90deg, #4299e1, #38b2ac);
      border-radius: 2px;
    }
    
    /* Status Messages */
    .status-message {
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .status-message.error {
      background: linear-gradient(135deg, #fed7d7 0%, #feebeb 100%);
      color: #9b2c2c;
      border-left: 4px solid #f56565;
    }
    
    .status-message.loading {
      background: linear-gradient(135deg, #bee3f8 0%, #ebf8ff 100%);
      color: #2b6cb0;
      border-left: 4px solid #4299e1;
    }
    
    .status-message.success {
      background: linear-gradient(135deg, #c6f6d5 0%, #f0fff4 100%);
      color: #276749;
      border-left: 4px solid #38a169;
    }
    
    /* Mode Selection */
    .mode-selection-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      background: #f7fafc;
      padding: 6px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
    }
    
    .mode-selection-buttons button {
      flex: 1;
      border: none;
      background: transparent;
      padding: 16px 20px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #4a5568;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 15px;
      position: relative;
      overflow: hidden;
    }
    
    .mode-selection-buttons button:before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    
    .mode-selection-buttons button:hover:before {
      left: 100%;
    }
    
    .mode-selection-buttons button:hover {
      color: #2d3748;
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.7);
    }
    
    .mode-selection-buttons button.active {
      background: white;
      color: #1a365d;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    
    .mode-selection-buttons button.active:after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 3px;
      background: linear-gradient(90deg, #4299e1, #38b2ac);
      border-radius: 2px;
    }
    
    /* Buttons */
    .camera-control-btn, .capture-btn, .flip-camera-btn, .retake-btn {
      padding: 14px 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 15px;
      position: relative;
      overflow: hidden;
    }
    
    .camera-control-btn {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
    }
    
    .camera-control-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
    }
    
    .camera-control-btn:active {
      transform: translateY(-1px);
    }
    
    .stop-camera {
      background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
      box-shadow: 0 4px 15px rgba(245, 101, 101, 0.3);
    }
    
    .capture-btn {
      background: linear-gradient(135deg, #38b2ac 0%, #319795 100%);
      color: white;
      flex: 1;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(56, 178, 172, 0.3);
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .capture-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(56, 178, 172, 0.4);
    }
    
    .flip-camera-btn {
      background: rgba(255, 255, 255, 0.95);
      color: #2d3748;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    .flip-camera-btn:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
    
    .retake-btn {
      background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }
    
    .retake-btn:hover {
      background: #e2e8f0;
      transform: translateY(-2px);
    }
    
    /* Action Buttons Row */
    .action-buttons-row {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    
    .action-buttons-row button {
      padding: 12px 20px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      color: #4a5568;
    }
    
    .action-buttons-row button:hover {
      background: #f7fafc;
      transform: translateY(-2px);
      border-color: #cbd5e0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      color: #2d3748;
    }
    
    .action-buttons-row button:active {
      transform: translateY(0);
    }
    
    /* Camera Preview */
    video {
      transform: scaleX(1);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    }
    
    .camera-preview-container {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin: 24px 0;
      background: #1a202c;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .camera-overlay {
      position: absolute;
      bottom: 24px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 0 24px;
      z-index: 10;
    }
    
    .capture-indicator {
      position: absolute;
      top: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.6);
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      backdrop-filter: blur(4px);
    }
    
    .pulse-circle {
      width: 10px;
      height: 10px;
      background: #38b2ac;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
      100% { opacity: 0.4; transform: scale(0.8); }
    }
    
    /* Upload Area */
    .upload-area {
      text-align: center;
      padding: 48px 20px;
      border: 2px dashed #cbd5e0;
      border-radius: 20px;
      background: #f7fafc;
      transition: all 0.3s ease;
      margin: 24px 0;
    }
    
    .upload-area:hover {
      border-color: #4299e1;
      background: #edf2f7;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
    }
    
    .upload-area.drag-over {
      border-color: #38b2ac;
      background: #e6fffa;
    }
    
    /* Textarea for Description Mode */
    textarea {
      width: 100%;
      min-height: 160px;
      padding: 20px;
      border-radius: 16px;
      border: 2px solid #e2e8f0;
      margin-bottom: 20px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #2d3748;
      background: #f7fafc;
      transition: all 0.3s ease;
      resize: vertical;
    }
    
    textarea:focus {
      outline: none;
      border-color: #4299e1;
      background: white;
      box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.1);
    }
    
    textarea::placeholder {
      color: #a0aec0;
      font-style: italic;
    }
    
    /* Results Section */
    .analysis-result-box {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 28px;
      margin-top: 32px;
      animation: fadeInUp 0.5s ease-out;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .results-header h3 {
      margin: 0;
      font-size: 22px;
      color: #1a365d;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .analysis-result-content {
      font-size: 15px;
      line-height: 1.8;
      color: #2d3748;
    }
    
    .analysis-result-content h3 {
      font-size: 18px;
      margin: 24px 0 12px 0;
      color: #2c5282;
      font-weight: 700;
      position: relative;
      padding-left: 16px;
    }
    
    .analysis-result-content h3:before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      background: #4299e1;
      border-radius: 50%;
    }
    
    .analysis-result-content strong {
      color: #2b6cb0;
      font-weight: 700;
    }
    
    .analysis-result-content ul {
      padding-left: 24px;
      margin-bottom: 16px;
    }
    
    .analysis-result-content li {
      margin-bottom: 10px;
      position: relative;
      padding-left: 8px;
    }
    
    .analysis-result-content li:before {
      content: ' ';
      color: #4299e1;
      font-weight: bold;
      position: absolute;
      left: -16px;
    }
    
    /* Image Preview */
    .captured-image-preview {
      margin: 32px 0;
      animation: fadeIn 0.5s ease-out;
    }
    
    .captured-image-preview h3 {
      font-size: 20px;
      color: #1a365d;
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .captured-image-preview img {
      max-width: 100%;
      border-radius: 16px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }
    
    .captured-image-preview img:hover {
      transform: scale(1.01);
    }
    
    /* Spinner */
    .spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .analysis-container {
        padding: 16px;
      }
      
      .report-analysis-box {
        padding: 24px;
        border-radius: 16px;
      }
      
      h1 {
        font-size: 24px;
        margin-bottom: 24px;
      }
      
      .mode-selection-buttons {
        flex-direction: column;
        gap: 8px;
      }
      
      .mode-selection-buttons button {
        padding: 14px;
      }
      
      .camera-control-btn, .capture-btn, .flip-camera-btn, .retake-btn {
        padding: 12px 20px;
        font-size: 14px;
      }
      
      .action-buttons-row {
        gap: 8px;
      }
      
      .action-buttons-row button {
        flex: 1;
        min-width: 100px;
        justify-content: center;
      }
      
      .camera-preview-container {
        min-height: 300px;
      }
      
      .camera-overlay {
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      
      .capture-btn {
        order: -1;
      }
    }
    
    @media (max-width: 480px) {
    .analysis-container {
    width: 350px;
    }
      .report-analysis-box {
        padding: 20px;
	margin-left: 0px;
      }
      
      h1 {
        font-size: 22px;
      }
      
      .mode-selection-buttons button {
        padding: 12px;
        font-size: 14px;
      }
      
      .analysis-result-box {
        padding: 20px;
      }
      
      .results-header h3 {
        font-size: 20px;
      }
    }
    
    /* Print Styles */
    @media print {
      .analysis-container {
        background: white;
        max-width: 100%;
      }
      
      .report-analysis-box {
        box-shadow: none;
        border: 1px solid #ddd;
      }
      
      .mode-selection-buttons,
      .action-buttons-row,
      .camera-control-btn,
      button:not(.print-button) {
        display: none !important;
      }
    }
  `;

  return (
    <div className="analysis-container">
      <style>{styles}</style>

      <div className="report-analysis-box">
        <h1>
          <FileText size={32} style={{ color: '#4299e1' }} /> Health Report Analysis
        </h1>

        {statusMessage && (
          <div className={`status-message ${statusMessage.toString().includes("ready") ? "loading" : statusMessage.toString().includes("Copied") ? "success" : "error"}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {statusMessage}
            </span>
            <button onClick={() => setStatusMessage(null)} style={{ border: "none", background: "none", cursor: "pointer", color: 'inherit' }}>
              <XCircle size={20} />
            </button>
          </div>
        )}

        {/* MODE SWITCH */}
        <div className="mode-selection-buttons">
          <button
            onClick={() => { setScanMode("camera"); setCapturedImage(null); }}
            className={scanMode === "camera" ? "active" : ""}
          >
            <Camera size={20} /> Capture
          </button>

          <button
            onClick={() => { setScanMode("upload"); setCapturedImage(null); }}
            className={scanMode === "upload" ? "active" : ""}
          >
            <Upload size={20} /> Upload
          </button>

          <button
            onClick={() => { setScanMode("qr"); setCapturedImage(null); }}
            className={scanMode === "qr" ? "active" : ""}
          >
            <FileText size={20} /> Description
          </button>
        </div>

        {/* --- MAIN CONTENT AREA --- */}

        {/* 1. SHOW CAPTURED IMAGE IF EXISTS */}
        {capturedImage ? (
          <div className="captured-image-preview">
            <h3>
              <CheckCircle size={24} color="#38b2ac" /> Document Preview
            </h3>
            <img src={capturedImage} alt="Captured" />
            <div className="action-buttons-row">
              <button className="retake-btn" onClick={() => {
                setCapturedImage(null);
                setAnalysisResult("");
                if (scanMode === 'camera') startCamera(selectedDeviceId);
              }}>
                <RotateCcw size={18} /> Retake
              </button>
              <button className="camera-control-btn" style={{ background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' }} onClick={analyzeImage}>
                <CheckCircle size={18} /> Analyze Document
              </button>
            </div>
          </div>
        ) : (
          /* 2. IF NO IMAGE, SHOW MODE SPECIFIC CONTENT */
          <>
            {/* CAMERA MODE */}
            {scanMode === "camera" && (
              <>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
                  {!isCameraActive ? (
                    <button className="camera-control-btn" onClick={() => startCamera(selectedDeviceId)}>
                      <Camera size={20} /> Start Camera
                    </button>
                  ) : (
                    <button onClick={stopCamera} className="camera-control-btn stop-camera">
                      <StopCircle size={20} /> Stop Camera
                    </button>
                  )}
                  
                  {isCameraActive && devices.length > 1 && (
                    <button onClick={flipCamera} className="flip-camera-btn">
                      <FlipHorizontal size={20} /> Switch Camera
                    </button>
                  )}
                </div>

                {isCameraActive && (
                  <>
                    <div className="camera-preview-container">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          maxHeight: "500px",
                        }}
                      />

                      {isVideoReady && (
                        <div className="capture-indicator">
                          <div className="pulse-circle"></div>
                          Camera Active
                        </div>
                      )}

                      {/* Overlay Controls */}
                      <div className="camera-overlay">
                        <button
                          onClick={captureImage}
                          className="capture-btn"
                          disabled={!isVideoReady}
                          style={{ maxWidth: 220 }}
                        >
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", marginRight: 8 }}></div>
                          Capture Document
                        </button>

                        {devices.length > 1 && (
                          <button
                            onClick={flipCamera}
                            className="flip-camera-btn"
                          >
                            <FlipHorizontal size={22} />
                          </button>
                        )}
                      </div>
                    </div>
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                  </>
                )}
              </>
            )}

            {/* UPLOAD MODE */}
            {scanMode === "upload" && (
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*,text/plain"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  hidden
                />
                <div style={{ marginBottom: 24, color: "#718096" }}>
                  <Upload size={56} style={{ margin: "0 auto", display: "block", marginBottom: 16, color: "#4299e1" }} />
                  <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Upload Medical Document</p>
                  <p style={{ fontSize: 14, opacity: 0.8 }}>Images or text files supported</p>
                </div>
                <button className="camera-control-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} /> Browse Files
                </button>
                <p style={{ fontSize: 12, color: "#a0aec0", marginTop: 16 }}>
                  Supports: JPG, PNG, PDF, TXT files
                </p>
              </div>
            )}

            {/* DESCRIPTION MODE (text-only) */}
            {scanMode === "qr" && (
              <div className="qr-container">
                <textarea
                  placeholder="Enter symptoms, medication names, or describe your health concern..."
                  value={qrScanResult}
                  onChange={(e) => setQrScanResult(e.target.value)}
                />

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="camera-control-btn" onClick={analyzeQrData} style={{ flex: 1, minWidth: 200 }}>
                    <CheckCircle size={20} /> Analyze Description
                  </button>

                  <button className="retake-btn" onClick={() => { setQrScanResult(''); }}>
                    <RotateCcw size={18} /> Clear Text
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* LOADING */}
        {loading && (
          <div className="status-message loading" style={{ marginTop: 28, justifyContent: "center", gap: 16 }}>
            <Loader2 className="spinner" size={24} />
            <span style={{ fontSize: 16 }}>Analyzing document with AI...</span>
          </div>
        )}

        {/* ANALYSIS OUTPUT */}
        {analysisResult && (
          <div className="analysis-result-box">
            <div className="results-header">
              <h3>
                <CheckCircle size={24} color="#38b2ac" /> Analysis Result
              </h3>
              <CheckCircle size={24} color="#38b2ac" />
            </div>
            <div className="analysis-result-content" dangerouslySetInnerHTML={{ __html: analysisResult }} />
            <div className="action-buttons-row" style={{ marginTop: 28, borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
              <button onClick={exportToPdf} style={{ background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)', color: 'white', border: 'none' }}>
                <Download size={18} /> Save PDF
              </button>
              <button onClick={exportToTxt} style={{ background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)', color: 'white', border: 'none' }}>
                <Download size={18} /> Save TXT
              </button>
              <button onClick={copyToClipboard} style={{ background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)', color: 'white', border: 'none' }}>
                <Copy size={18} /> Copy Text
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}