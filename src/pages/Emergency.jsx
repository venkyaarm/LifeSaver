import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  MessageSquare,
  MapPin,
  HeartPulse,
  Syringe,
  Timer,
  Info,
  XCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';

// Main App Component
const App = () => {
  const [countdown, setCountdown] = useState(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'geolocation' or 'autocall'

  // Countdown effect to trigger auto-call
  useEffect(() => {
    let timer;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      // Direct call to tel:108
      window.location.href = "tel:108";
      setCountdown(null);
      setIsModalOpen(false); // Close the modal
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handler to open the Geolocation warning modal
  const handleShareLocation = () => {
    if (navigator.geolocation) {
      // The browser supports geolocation, so we can proceed
      sendLocationToWhatsApp();
    } else {
      // Geolocation is not supported, show a modal instead of an alert
      setModalType('geolocation');
      setIsModalOpen(true);
    }
  };

  // Function to share live location with emergency message (opens WhatsApp)
  const sendLocationToWhatsApp = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `🚨 EMERGENCY! Please send help immediately.\n📍 My Location: ${mapsUrl}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setModalType('geolocationError');
        setIsModalOpen(true);
      }
    );
  };

  // Handler for the auto-call button
  const handleAutoCall = () => {
    setModalType('autocall');
    setIsModalOpen(true);
  };

  // Start the countdown after modal confirmation
  const startCountdown = () => {
    setCountdown(5);
    setIsModalOpen(false);
  };

  return (
    <div className="emergency-bg">
      <div className="emergency-container">
        <div className="emergency-card">
          <div className="emergency-icon-container">
            <HeartPulse size={48} className="emergency-icon" />
          </div>
          <h1 className="main-title">Emergency Contact Hub</h1>
          <p className="description">
            In a critical situation, use these tools to get immediate help.
          </p>

          <div className="emergency-buttons-grid">
            <a href="tel:108" className="btn primary-btn">
              <Phone size={24} />
              <span>Call Ambulance (108)</span>
            </a>
            <a href="sms:108?body=I%20need%20urgent%20help" className="btn secondary-btn">
              <MessageSquare size={24} />
              <span>Send SMS</span>
            </a>
            <button className="btn secondary-btn" onClick={handleShareLocation}>
              <MapPin size={24} />
              <span>Share Location (WhatsApp)</span>
            </button>
            <button className="btn secondary-btn" onClick={handleAutoCall}>
              <Timer size={24} />
              <span>Auto-Call (5s)</span>
            </button>
          </div>
          {countdown !== null && (
            <div className="countdown-message">
              <p>Calling in <span className="countdown-number">{countdown}</span> seconds...</p>
            </div>
          )}
          <hr className="divider" />
          <div className="tips-section">
            <h3 className="tips-title">
              <Syringe size={20} /> Quick First-Aid Tips
            </h3>
            <ul className="tips-list">
              <li>
                <div className="tip-item">
                  <span className="tip-label">Heart Attack:</span> Keep patient calm, call for help, give aspirin if available.
                </div>
              </li>
              <li>
                <div className="tip-item">
                  <span className="tip-label">Severe Bleeding:</span> Apply direct pressure with a clean cloth.
                </div>
              </li>
              <li>
                <div className="tip-item">
                  <span className="tip-label">Burns:</span> Cool with running water for 10-20 mins.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <XCircle size={20} />
            </button>
            {modalType === 'geolocation' && (
              <>
                <div className="modal-header">
                  <AlertTriangle size={36} className="modal-icon" />
                  <h3 className="modal-title">Geolocation Not Supported</h3>
                </div>
                <p>This browser does not support the Geolocation API. Please use a different browser or share your location manually.</p>
              </>
            )}
            {modalType === 'geolocationError' && (
              <>
                <div className="modal-header">
                  <AlertTriangle size={36} className="modal-icon" />
                  <h3 className="modal-title">Location Access Denied</h3>
                </div>
                <p>Please enable location services in your browser settings to share your location.</p>
              </>
            )}
            {modalType === 'autocall' && (
              <>
                <div className="modal-header">
                  <Phone size={36} className="modal-icon" />
                  <h3 className="modal-title">Confirm Auto-Call</h3>
                </div>
                <p>
                  You are about to automatically dial the emergency number. Do you want to continue?
                </p>
                <div className="modal-buttons">
                  <button className="btn secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn primary-btn" onClick={startCountdown}>Confirm</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        :root {
          --color-bg-dark: #1a1a2e;
          --color-card-bg: #27273d;
          --color-primary: #e94560;
          --color-secondary: #0f3460;
          --color-text-light: #f5f5f5;
          --color-text-subtle: #a0a0b2;
          --color-accent-blue: #32a8ff;
          --shadow-strong: 0 10px 30px rgba(0, 0, 0, 0.4);
          --shadow-soft: 0 4px 15px rgba(0, 0, 0, 0.2);
          --radius-large: 20px;
          --transition-fast: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          background-color: var(--color-bg-dark);
          color: var(--color-text-light);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .emergency-bg {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, var(--color-bg-dark) 0%, #16213e 100%);
          animation: background-pan 20s ease-in-out infinite;
        }

        .emergency-container {
          width: 100%;
          max-width: 600px;
          animation: fade-in 0.8s ease-out;
        }

        .emergency-card {
          background-color: var(--color-card-bg);
          border-radius: var(--radius-large);
          padding: 40px;
          box-shadow: var(--shadow-strong);
          text-align: center;
          position: relative;
        }

        .emergency-icon-container {
          background-color: var(--color-primary);
          border-radius: 50%;
          padding: 15px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
          animation: pulse 2s infinite;
        }

        .emergency-icon {
          color: var(--color-text-light);
        }

        .main-title {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--color-primary);
          margin-top: 0;
          margin-bottom: 10px;
        }

        .description {
          font-size: 1.1rem;
          color: var(--color-text-subtle);
          margin-bottom: 30px;
        }

        .emergency-buttons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 20px;
          border-radius: var(--radius-large);
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-soft);
          border: none;
        }

        .primary-btn {
          background-color: var(--color-primary);
          color: var(--color-text-light);
          grid-column: 1 / -1; /* Make the primary button full width on smaller screens */
        }
        .primary-btn:hover {
          background-color: #d13d54;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(233, 69, 96, 0.4);
        }

        .secondary-btn {
          background-color: var(--color-secondary);
          color: var(--color-text-light);
        }
        .secondary-btn:hover {
          background-color: #0d2a4e;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(15, 52, 96, 0.4);
        }
        
        .countdown-message {
          margin-top: 20px;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--color-accent-blue);
          animation: fade-in 0.5s ease-in-out;
        }
        .countdown-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary);
        }
        
        .divider {
          border: 0;
          height: 1px;
          background: linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.5), rgba(255,255,255,0.1));
          margin: 30px 0;
        }

        .tips-section {
          text-align: left;
        }

        .tips-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-light);
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tips-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .tip-item {
          padding: 15px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
        }
        
        .tip-label {
          font-weight: 700;
          color: var(--color-primary);
          margin-right: 5px;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
          animation: fade-in 0.3s ease-out;
        }
        
        .modal-content {
          background-color: var(--color-card-bg);
          padding: 30px;
          border-radius: var(--radius-large);
          box-shadow: var(--shadow-strong);
          max-width: 400px;
          width: 90%;
          text-align: center;
          position: relative;
          animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        
        .modal-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: var(--color-text-subtle);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .modal-close-btn:hover {
          color: var(--color-primary);
        }

        .modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-icon {
          color: var(--color-accent-blue);
          margin-bottom: 10px;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .modal-buttons {
          margin-top: 20px;
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.5); }
          70% { box-shadow: 0 0 0 20px rgba(233, 69, 96, 0); }
          100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0); }
        }
        
        @keyframes background-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @media (max-width: 480px) {
          .emergency-card {
            padding: 25px;
          }
          .main-title {
            font-size: 1.8rem;
          }
          .description {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
