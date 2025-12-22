import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        alert("⚠ Please verify your email before logging in.");
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      alert("❌ " + error.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert("📩 Password reset email sent! Please check your inbox (or Spam folder).");
      setShowReset(false);
    } catch (error) {
      alert("❌ " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Hospital App Login</h2>
        <p className="login-subtitle">Access your account securely</p>

        {!showReset ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn">Login</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Enter your email to reset password</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-btn">Send Reset Link</button>
          </form>
        )}

        <p className="register-text">
          Don’t have an account?{" "}
          <Link to="/register" className="register-link">Register here</Link>
        </p>

        <p className="forgot-password">
          <button
            onClick={() => setShowReset(!showReset)}
            className="forgot-link"
          >
            {showReset ? "Back to Login" : "Forgot Password?"}
          </button>
        </p>
      </div>
    </div>
  );
}