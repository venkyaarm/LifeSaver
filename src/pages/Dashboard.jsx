import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-main">
      {/* Welcome Section */}
      <section className="welcome-section">
        <h1>
          Welcome to <span>Health QR Manager</span>
        </h1>
        <p>
          This app helps you store your health details in a QR code. In case of
          an accident or emergency, doctors can scan your QR code, view your
          medical information, and contact your family immediately to provide
          treatment.
        </p>
      </section>

      {/* Info Section - How It Works */}
      <section className="info-section">
        <h2>How to Use the App</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>1. Create Your Digital Health Profile</h3>
            <p>
              Input your essential medical history, allergies, medications, and emergency contacts.
              Our system then securely generates your unique, scannable QR code.
            </p>
          </div>

          <div className="info-box">
            <h3>2. Carry Your Health QR Code</h3>
            <p>
              Download your personalized QR code and save it to your phone's lock screen,
              print it for your wallet, or attach it to a medical ID bracelet. It's always with you.
            </p>
          </div>

          <div className="info-box">
            <h3>3. Enable Rapid Emergency Access</h3>
            <p>
              In a critical situation, first responders and medical staff can instantly scan your QR code
              to access vital information, ensuring swift and informed care.
            </p>
          </div>

          <div className="info-box">
            <h3>4. Keep Your Profile Up-to-Date</h3>
            <p>
              Regularly update your health information within the app. Maintaining accurate records
              ensures medical professionals always have your most current details for optimal care.
            </p>
          </div>

          {/* New sections added below */}
          <div className="info-box">
            <h3>5. Connect with a Doctor</h3>
            <p>
              Access online consultations or get answers to your health queries directly from certified medical professionals.
            </p>
          </div>

          <div className="info-box">
            <h3>6. Understand Your Medical Tests</h3>
            <p>
              Upload and analyze your medical reports, including lab results and diagnostic scans, to gain clear insights into your health.
            </p>
          </div>

          <div className="info-box">
            <h3>7. Personalized Skin Health Insights</h3>
            <p>
              Receive tailored advice and recommendations for maintaining healthy skin based on your profile and concerns.
            </p>
          </div>

          <div className="info-box">
            <h3>8. Locate Nearby Hospitals & Clinics</h3>
            <p>
              Quickly find the nearest hospitals, clinics, and specialized medical facilities based on your current location.
            </p>
          </div>

          <div className="info-box">
            <h3>9. Comprehensive Health Report Analysis</h3>
            <p>
              Get detailed analysis of your aggregated health data over time, identifying trends and areas for proactive health management.
            </p>
          </div>

          <div className="info-box">
            <h3>10. Tailored Food & Diet Plans</h3>
            <p>
              Receive personalized dietary recommendations and meal plans designed to support your health goals and nutritional needs.
            </p>
          </div>

          {/* Removed: Your Digital Health Card section */}
        </div>
      </section>
    </div>
  );
}
