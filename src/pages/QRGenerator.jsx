import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import "./QRGenerator.css";

const CLOUD_NAME = "doi1kxw5o";
const UPLOAD_PRESET = "venky_unsigned";

export default function QRGenerator() {
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    disease: "",
    allergies: "",
    address: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    doctorName: "",
    doctorContact: "",
    photo: "", // local preview or cloudinary URL
  });

  const [loading, setLoading] = useState(true);
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(""); // top confirmation message
  const qrRef = useRef();

  // Fetch saved data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = doc(db, "users", user.uid);
          const snapshot = await getDoc(userDoc);

          if (snapshot.exists()) {
            const savedData = snapshot.data();
            setFormData(savedData);
            if (savedData.cloudinaryUrl) {
              setCloudinaryUrl(savedData.cloudinaryUrl);
            }
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      photo: URL.createObjectURL(file),
      localFile: file,
    }));
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "";

    for (let word of words) {
      const testLine = line + word + " ";
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line !== "") {
        ctx.fillText(line, x, y);
        line = word + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    ctx.fillText(line, x, y);
    return y + lineHeight;
  };

  // Generate + Upload new profile card to Cloudinary
  const generateAndUploadImage = async () => {
    if (!formData.photo) throw new Error("No photo uploaded");

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 650;
      canvas.height = 550;

      // Background
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = formData.photo;

      img.onload = () => {
        ctx.drawImage(img, 20, 40, 120, 150);
        ctx.fillStyle = "#000";
        ctx.font = "16px Arial";

        let y = 60;
        const gap = 25;

        const details = [
          `Name: ${formData.name}`,
          `DOB: ${formData.dob}`,
          `Gender: ${formData.gender}`,
          `Blood Group: ${formData.bloodGroup}`,
          `Disease: ${formData.disease}`,
          `Allergies: ${formData.allergies}`,
        ];

        details.forEach((line) => {
          ctx.fillText(line, 160, y);
          y += gap;
        });

        ctx.fillText("Address:", 160, y);
        y = wrapText(ctx, formData.address, 230, y, 380, 20) + 5;

        const moreDetails = [
          `Parent Name: ${formData.parentName}`,
          `Parent Contact: ${formData.parentContact}`,
          `Emergency Contact: ${formData.emergencyContact}`,
          `Doctor Name: ${formData.doctorName}`,
          `Doctor Contact: ${formData.doctorContact}`,
        ];

        moreDetails.forEach((line) => {
          ctx.fillText(line, 160, y);
          y += gap;
        });

        // Upload to Cloudinary
        canvas.toBlob(async (blob) => {
          const formDataCloud = new FormData();
          formDataCloud.append("file", blob);
          formDataCloud.append("upload_preset", UPLOAD_PRESET);

          try {
            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
              { method: "POST", body: formDataCloud }
            );
            const data = await res.json();
            resolve(data.secure_url);
          } catch (err) {
            reject(err);
          }
        }, "image/png");
      };
    });
  };

  // Save details (new image)
  const saveDetails = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");

    try {
      const imageUrl = await generateAndUploadImage();
      setCloudinaryUrl(imageUrl);

      const { localFile, ...dataToSave } = formData;

      await setDoc(doc(db, "users", user.uid), {
        ...dataToSave,
        cloudinaryUrl: imageUrl,
      });

      setMessage("✅ Details are saved!");
      setIsEditing(false); // exit edit mode
    } catch (err) {
      console.error("Error saving data:", err);
      alert("❌ Failed to save data.");
    }
  };

  const qrValue = useMemo(
    () => cloudinaryUrl || "Upload details first!",
    [cloudinaryUrl]
  );

  const downloadPNG = () => {
    try {
      const canvas = qrRef.current.querySelector("canvas");
      const url = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = url;
      a.download = "Health_QR.png";
      a.click();
    } catch (err) {
      console.error("Failed to download PNG:", err);
    }
  };

  const downloadPDF = () => {
    try {
      const canvas = qrRef.current.querySelector("canvas");
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.text("Health QR Code", 70, 20);
      pdf.addImage(imgData, "PNG", 40, 40, 130, 130);
      pdf.save("Health_QR.pdf");
    } catch (err) {
      console.error("Failed to download PDF:", err);
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

  return (
    <div className="qr-bg">
      <div className="qr-wrapper">
        <div className="qr-card">
          <h2 className="qr-title">✨ Generate Your Health QR Code ✨</h2>
          
          {/* Show top message if saved */}
          {message && <p className="top-message">{message}</p>}

          {/* Edit button */}
          {!isEditing && (
            <button
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit Details
            </button>
          )}

          <form className="qr-grid">
            {/* Left Column */}
            <div className="qr-left">
              {[
                ["Full Name", "name", "Enter full name"],
                ["Date of Birth", "dob", "", "date"],
                ["Gender", "gender", "", "select"],
                ["Blood Group", "bloodGroup", "Ex: A+"],
                ["Known Diseases", "disease", "Ex: Diabetes"],
                ["Allergies", "allergies", "Ex: Penicillin"],
                ["Address", "address", "Full address", "textarea"],
                ["Parent Name", "parentName", "Ex: John Doe"],
                ["Parent Contact", "parentContact", "Ex: 9876543210"],
                ["Emergency Contact", "emergencyContact", "Ex: 9876543210"],
                ["Doctor Name", "doctorName", "Ex: Dr. Smith"],
                ["Doctor Contact", "doctorContact", "Ex: 9876543210"],
              ].map(([label, name, placeholder, type]) => (
                <div key={name}>
                  <label>{label}</label>
                  {(isEditing || !cloudinaryUrl) && (
                    type === "textarea" ? (
                      <textarea
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                      />
                    ) : type === "select" ? (
                      <select
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                      >
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    ) : (
                      <input
                        type={type || "text"}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                      />
                    )
                  )}
                </div>
              ))}

              {(isEditing || !cloudinaryUrl) && (
                <>
                  <label>Upload Passport Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </>
              )}
            </div>

            {/* Right Column */}
            <div className="qr-right">
              <div className="qr-code-container" ref={qrRef}>
                <QRCodeCanvas
                  value={qrValue}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              {(isEditing || !cloudinaryUrl) && (
                <div className="btn-group">
                  <button type="button" onClick={saveDetails} className="save-btn">
                    💾 Save
                  </button>
                  <button
                    type="button"
                    onClick={downloadPNG}
                    className="qr-btn secondary"
                  >
                    🖼 PNG
                  </button>
                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="qr-btn secondary"
                  >
                    📄 PDF
                  </button>
                </div>
              )}

              {cloudinaryUrl && !isEditing && (
                <p className="qr-link">
                   Uploaded to Cloudinary:{" "}
                  <a
                    href={cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Image
                  </a>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
