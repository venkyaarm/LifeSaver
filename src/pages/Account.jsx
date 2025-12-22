import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import "./Account.css";

export default function Account() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setDetails(docSnap.data());
          } else {
            setDetails(null);
          }
        } catch (err) {
          console.error("Error fetching details:", err);
          setDetails(null);
        }
      } else {
        setDetails(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const downloadQRImage = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "health_qr.png";
    link.click();
  };

  const downloadQRPDF = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("My Health QR Code", 20, 20);
    pdf.addImage(url, "PNG", 20, 30, 100, 100);
    pdf.save("health_qr.pdf");
  };

  const printQR = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const img = canvas.toDataURL("image/png");
    const newWin = window.open("");
    newWin.document.write(`<img src="${img}" />`);
    newWin.print();
  };

  const copyDetails = () => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    alert("✅ Details copied to clipboard!");
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      signOut(auth).then(() => {
        window.location.href = "/login";
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your details...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="account-container">
        <h2>No details found</h2>
        <p>Please go to the QR Generator page to fill in your information.</p>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div className="account-card glass-effect">
        <h2 className="account-title">👤 My Account</h2>

        <div className="account-content">
          {/* Left column: Details */}
          <div className="details-section">
            <h3>Personal Details</h3>
            <ul>
              {Object.entries(details).map(([key, value]) => (
                key !== "cloudinaryUrl" && (
                  <li key={key}>
                    <strong>{key}:</strong> {value?.toString()}
                  </li>
                )
              ))}
            </ul>

            {details.cloudinaryUrl && (
              <p>
                ✅ Uploaded Card:{" "}
                <a
                  href={details.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Image
                </a>
              </p>
            )}

            <div className="account-buttons">
              <button className="btn primary" onClick={copyDetails}>
                📋 Copy Details
              </button>
              <button className="btn danger" onClick={handleLogout}>
                🚪 Log Out
              </button>
            </div>
          </div>

          {/* Right column: QR Code */}
          <div className="qr-section" ref={qrRef}>
            <h3>Your QR Code</h3>
            <QRCodeCanvas
              value={details.cloudinaryUrl || "No QR generated yet"}
              size={200}
              level="H"
              includeMargin={true}
            />
            <div className="download-buttons">
              <button className="btn" onClick={downloadQRImage}>
                🖼 Download PNG
              </button>
              <button className="btn secondary" onClick={downloadQRPDF}>
                📄 Download PDF
              </button>
              <button className="btn print" onClick={printQR}>
                🖨️ Print QR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
