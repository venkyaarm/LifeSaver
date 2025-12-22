import React, { useState, useEffect, useCallback } from "react";
import {
  getAuth,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  LifeBuoy,
  LogOut,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react'; // Import Lucide icons

const Settings = () => {
  const auth = getAuth();
  const [userEmail, setUserEmail] = useState(null);
  const [userDisplayedName, setUserDisplayedName] = useState("Guest User"); // State for display name (renamed for clarity)
  const [message, setMessage] = useState(null); // Custom message state { type: 'success' | 'error', text: string }
  const [loading, setLoading] = useState(false); // State for loading indicator

  // Effect to get user email and display name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) { // Ensure user and user.email exist
        setUserEmail(user.email);
        // Extract the part before '@' for the username display
        const username = user.email.split('@')[0];
        setUserDisplayedName(username);
      } else {
        setUserEmail(null);
        setUserDisplayedName("Guest User"); // Fallback for not logged in
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Custom Message Display Function
  const showCustomMessage = useCallback((type, text) => {
    setMessage({ type, text });
    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000); // Message disappears after 5 seconds
    return () => clearTimeout(timer); // Cleanup timer if component unmounts or message changes
  }, []);

  const handlePasswordReset = async () => {
    if (!userEmail) {
      showCustomMessage('error', 'You must be logged in with an email to reset your password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      showCustomMessage('success', 'Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error("Password reset error:", error);
      showCustomMessage('error', `Error sending reset email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      showCustomMessage('success', 'Logged out successfully!');
    } catch (error) {
      console.error("Logout error:", error);
      showCustomMessage('error', `Error logging out: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h2><SettingsIcon size={32} /> Settings</h2>

      {/* Custom Message Display */}
      {message && (
        <div className={`custom-message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
          <button className="close-btn" onClick={() => setMessage(null)}><XCircle size={18} /></button>
        </div>
      )}

      {loading && (
        <div className="custom-message loading">
          <Loader2 size={20} className="spinner" />
          <span>Processing...</span>
        </div>
      )}

      {/* User Profile Information (now displaying username from email) */}
      <div className="settings-item">
        <label><User size={20} /> Username:</label>
        <p className="value-display">{userDisplayedName}</p>
      </div>

      {/* Email Display */}
      <div className="settings-item">
        <label><Lock size={20} /> Email:</label>
        <p className="value-display">{userEmail || "Not logged in"}</p>
      </div>

      {/* Change Password */}
      <div className="settings-item">
        <label><Lock size={20} /> Change Password:</label>
        <button className="btn" onClick={handlePasswordReset} disabled={loading}>
          {loading ? <Loader2 size={20} className="spinner" /> : 'Send Reset Email'}
        </button>
      </div>

      {/* Help & Support */}
      <div className="settings-item">
        <label><LifeBuoy size={20} /> Help & Support:</label>
        <p>
          For any issues, contact us at{" "}
          <a href="mailto:triospherehospital@gmail.com">triospherehospital@gmail.com</a>
        </p>
      </div>

      {/* Logout */}
      <div className="settings-item">
        <label><LogOut size={20} /> Logout:</label>
        <button className="btn logout" onClick={handleLogout} disabled={loading}>
          {loading ? <Loader2 size={20} className="spinner" /> : 'Logout'}
        </button>
      </div>

      {/* CSS Styles inside JSX */}
      <style>{`
        /* --- Variables for Easy Theming --- */
        :root {
          --color-primary: #0077b6; /* Deep Ocean Blue - Main accent */
          --color-primary-light: #e0f2f7; /* Very light blue for backgrounds, subtle highlights */
          --color-primary-dark: #005f8a; /* Darker blue for hover states */

          --color-secondary: #28a745; /* Clean Medical Green - Complementary accent for success/links */
          --color-secondary-dark: #1e7e34;

          --color-danger: #dc3545; /* Red for destructive actions like logout/delete */
          --color-danger-dark: #c82333;

          --color-text-dark: #2c3e50; /* Dark Charcoal - For main text (professional) */
          --color-text-medium: #34495e; /* Slightly lighter gray for labels, secondary text */
          --color-text-light: #7f8c8d; /* Medium gray for footer/hints */

          --color-bg-light: #f8fcfd; /* Off-white for section backgrounds */
          --color-bg-white: #ffffff; /* Pure white for card backgrounds */

          --gradient-bg-start: #eaf6fa; /* Very light blue-grey for body background */
          --gradient-bg-middle: #f8fcfd;
          --gradient-bg-end: #eaf6fa;

          --shadow-base: 0 4px 10px rgba(0, 0, 0, 0.08);
          --shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.12);
          --shadow-card: 0 10px 30px rgba(0, 0, 0, 0.15);

          --border-radius-sm: 0.25rem;
          --border-radius-md: 0.5rem;
          --border-radius-lg: 0.75rem;
          --border-radius-xl: 1rem;

          --spacing-xs: 0.5rem;   /* 8px */
          --spacing-sm: 0.75rem;  /* 12px */
          --spacing-md: 1rem;     /* 16px */
          --spacing-lg: 1.5rem;   /* 24px */
          --spacing-xl: 2rem;     /* 32px */
        }

        /* --- Global Body Styling --- */
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, var(--gradient-bg-start), var(--gradient-bg-middle), var(--gradient-bg-end));
          color: var(--color-text-dark);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        /* --- Settings Container --- */
        .settings-container {
          
          width: 150%;
          margin: var(--spacing-xl) auto;
          padding: 18px;
          background: var(--color-bg-white);
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-card);
          transition: all 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          box-sizing: border-box;
	  justify-content: center;
        }

        .settings-container h2 {
          font-size: 2.2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: var(--spacing-lg);
          color: var(--color-primary-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          letter-spacing: -0.02em;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.02);
        }

        /* --- Individual Setting Items --- */
        .settings-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background-color: var(--color-bg-light);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-base);
          transition: all 0.2s ease-in-out;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          border: 1px solid rgba(0,0,0,0.05);
        }

        .settings-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-hover);
        }

        .settings-item label {
          font-weight: 600;
          color: var(--color-text-medium);
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex-grow: 1;
          text-align: left;
        }
        .settings-item label svg {
            color: var(--color-primary);
            flex-shrink: 0;
        }

        .settings-item p {
          margin: 0;
          color: var(--color-text-dark);
          font-weight: 500;
          flex-shrink: 0;
        }

        .settings-item .value-display {
            color: var(--color-text-dark);
            font-weight: 600;
            font-size: 1.05rem;
        }

        /* --- Buttons --- */
        .btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          border: none;
          border-radius: var(--border-radius-md);
          cursor: pointer;
          background: var(--color-primary);
          color: white;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease-in-out;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          box-shadow: var(--shadow-base);
          flex-shrink: 0;
        }

        .btn:hover {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-hover);
        }

        .btn:active {
          transform: translateY(0);
          box-shadow: var(--shadow-base);
        }

        .btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            opacity: 0.7;
        }

        .btn.logout {
          background: var(--color-danger);
        }

        .btn.logout:hover {
          background: var(--color-danger-dark);
        }

        /* --- Links --- */
        a {
          color: var(--color-secondary);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease, text-decoration 0.2s ease;
        }

        a:hover {
          color: var(--color-secondary-dark);
          text-decoration: underline;
        }

        /* --- Custom Message Display (for replacing alert()) --- */
        .custom-message {
          padding: var(--spacing-md);
          border-radius: var(--border-radius-md);
          margin-bottom: var(--spacing-lg);
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          box-shadow: var(--shadow-base);
          animation: fadeInDown 0.5s ease-out;
          opacity: 1;
          transition: opacity 0.3s ease-out;
        }

        .custom-message.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .custom-message.success {
          background-color: var(--color-secondary);
          color: white;
        }

        .custom-message.error {
          background-color: var(--color-danger);
          color: white;
        }

        .custom-message .close-btn {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 0;
            margin-left: var(--spacing-sm);
            display: flex;
            align-items: center;
            transition: opacity 0.2s;
            opacity: 0.8;
        }

        .custom-message .close-btn:hover {
            opacity: 1;
        }

        /* Spinner for loading state */
        .spinner {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* --- Responsive Design --- */
        @media (max-width: 768px) {
          .settings-container {
            padding: var(--spacing-lg);
            margin: var(--spacing-lg) auto;
            border-radius: var(--border-radius-lg);
          }
          .settings-container h2 {
            font-size: 1.8rem;
            margin-bottom: var(--spacing-md);
          }
          .settings-item {
            flex-direction: column;
            align-items: flex-start;
            padding: var(--spacing-md);
          }
          .settings-item label {
            font-size: 1rem;
            width: 100%;
            margin-bottom: var(--spacing-sm);
          }
          .settings-item p, .settings-item .value-display {
            font-size: 0.95rem;
            width: 100%;
            text-align: left;
          }
          .btn, .settings-item select {
            width: 100%;
            margin-top: var(--spacing-md);
            font-size: 0.95rem;
            padding: var(--spacing-sm);
          }
        }

        @media (max-width: 480px) {
	.settings-container {
          max-width: 700px;
          width: 100%;
          margin: var(--spacing-xl) auto;
          padding: var(--spacing-xl);
          background: var(--color-bg-white);
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-card);
          transition: all 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          box-sizing: border-box;
        }
          .settings-container {
            padding: var(--spacing-md);
            margin: var(--spacing-md) auto;
          }
          .settings-container h2 {
            font-size: 1.5rem;
            gap: var(--spacing-xs);
          }
          .settings-item {
            padding: var(--spacing-sm);
            gap: var(--spacing-sm);
          }
          .settings-item label {
            font-size: 0.9rem;
          }
          .settings-item p, .settings-item .value-display {
            font-size: 0.9rem;
          }
          .btn {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
