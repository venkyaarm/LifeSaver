import React, { useState, useEffect } from "react";
import "../styles/FoodOrDietRecommendation.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FoodOrDietRecommendation() {
  const [preferences, setPreferences] = useState({
    dietType: "veg",
    allergies: "",
    calorieGoal: "",
    age: "",
    weight: "",
    healthGoal: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [nutritionSummary, setNutritionSummary] = useState(null);

  const PPLX_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;

  useEffect(() => {
    const savedFavorites = localStorage.getItem("dietFavorites");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const savedWater = localStorage.getItem("waterIntake");
    if (savedWater) setWaterIntake(Number(savedWater));

    fetchTipOfTheDay();
  }, []);

  const handleInputChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.value });
  };

  const calculateRecommendedWater = () => {
    const weight = parseInt(preferences.weight) || 70;
    return Math.round(weight * 30);
  };

  const getDietTypeLabel = (value) => {
    const labels = {
      veg: "Vegetarian",
      "non-veg": "Non-Vegetarian",
      vegan: "Vegan",
      keto: "Keto",
      paleo: "Paleo",
      mediterranean: "Mediterranean",
    };
    return labels[value] || value;
  };

  // --------------------------------------------------------------
  // EXPORT PDF
  // --------------------------------------------------------------
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Personalized Diet Plan", 105, 15, { align: "center" });

    autoTable(doc, {
      startY: 25,
      head: [["Personal Info", ""]],
      body: [
        ["Age", preferences.age || "Not specified"],
        ["Weight", preferences.weight || "Not specified"],
        ["Diet Type", getDietTypeLabel(preferences.dietType)],
        ["Allergies", preferences.allergies || "None"],
        ["Calorie Goal", preferences.calorieGoal || "Not specified"],
        ["Health Goal", preferences.healthGoal || "Not specified"],
      ],
    });

    if (recommendations.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Diet Plan"]],
        body: recommendations.map((r) => [r]),
      });
    }

    if (nutritionSummary) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Nutrition Summary"]],
        body: nutritionSummary.split("\n").map((line) => [line]),
      });
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Hydration", ""]],
      body: [
        ["Water Intake", `${waterIntake} ml`],
        ["Recommended", `${calculateRecommendedWater()} ml`],
      ],
    });

    doc.save("diet-plan.pdf");
  };

  // --------------------------------------------------------------
  // GET RECOMMENDATIONS
  // --------------------------------------------------------------
  const fetchRecommendations = async () => {
    if (!preferences.age || !preferences.weight) return;

    setLoading(true);

    try {
      const prompt = `
Create a personalized diet plan with:
Age: ${preferences.age}
Weight: ${preferences.weight}
Diet Type: ${preferences.dietType}
Allergies: ${preferences.allergies || "None"}
Calorie Goal: ${preferences.calorieGoal}
Health Goal: ${preferences.healthGoal}

Include:
- Breakfast
- Lunch
- Snacks
- Dinner
- Nutrition Summary
`;

      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PPLX_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";

      const lines = text.split("\n").filter((l) => l.trim() !== "");
      const index = lines.findIndex((line) =>
        /nutrition summary/i.test(line)
      );

      setRecommendations(lines.slice(0, index !== -1 ? index : lines.length));
      setNutritionSummary(
        index !== -1 ? lines.slice(index).join("\n") : null
      );

      setActiveTab("recommendations");
    } catch (err) {
      console.error(err);
      setRecommendations(["Error fetching plan"]);
    }

    setLoading(false);
  };

  // --------------------------------------------------------------
  // GET TIP OF THE DAY
  // --------------------------------------------------------------
  const fetchTipOfTheDay = async () => {
    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PPLX_API_KEY}`,
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "user",
                content: "Give a short healthy eating tip (1 line).",
              },
            ],
            max_tokens: 50,
          }),
        }
      );

      const data = await response.json();
      setTip(data?.choices?.[0]?.message?.content || "");
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------------------------------
  // FAVORITES
  // --------------------------------------------------------------
  const addToFavorites = (item) => {
    if (!favorites.includes(item)) {
      const updated = [...favorites, item];
      setFavorites(updated);
      localStorage.setItem("dietFavorites", JSON.stringify(updated));
    }
  };

  const removeFromFavorites = (item) => {
    const updated = favorites.filter((fav) => fav !== item);
    setFavorites(updated);
    localStorage.setItem("dietFavorites", JSON.stringify(updated));
  };

  // --------------------------------------------------------------
  // WATER TRACKER
  // --------------------------------------------------------------
  const addWaterGlass = () => {
    setWaterIntake((prev) => {
      const updated = prev + 250;
      localStorage.setItem("waterIntake", updated);
      return updated;
    });
  };

  const resetWaterIntake = () => {
    setWaterIntake(0);
    localStorage.setItem("waterIntake", "0");
  };

  // --------------------------------------------------------------
  // UI SECTION (FULLY ALIGNED VERSION)
  // --------------------------------------------------------------
  return (
    <div className="diet-main-container">
      <h1 className="diet-title">🥗 Food & Diet Recommendation</h1>

      <div className="diet-layout">
        {/* LEFT PANEL */}
        <div className="diet-left">
          <div className="form-card">
            <h2>🍎 Personalized Nutrition Planner</h2>

            <div className="form-grid">
              <input type="number" name="age" placeholder="Age" value={preferences.age} onChange={handleInputChange} />
              <input type="number" name="weight" placeholder="Weight (kg)" value={preferences.weight} onChange={handleInputChange} />

              <select name="dietType" value={preferences.dietType} onChange={handleInputChange}>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="paleo">Paleo</option>
                <option value="mediterranean">Mediterranean</option>
              </select>

              <input type="text" name="allergies" placeholder="Allergies" value={preferences.allergies} onChange={handleInputChange} />
              <input type="number" name="calorieGoal" placeholder="Calorie Goal" value={preferences.calorieGoal} onChange={handleInputChange} />
              <input type="text" name="healthGoal" placeholder="Health Goal" value={preferences.healthGoal} onChange={handleInputChange} />
            </div>

            <div className="button-row">
              <button className="primary-btn" onClick={fetchRecommendations}>
                {loading ? "Generating..." : "Generate Plan"}
              </button>

              <button className="secondary-btn" onClick={fetchTipOfTheDay}>
                Daily Tip
              </button>
            </div>
          </div>

          {tip && <div className="tip-box">💡 {tip}</div>}

          {/* WATER TRACKER */}
          <div className="water-card">
            <h3>
              💧 Water Intake: {waterIntake}ml <span>(Recommended: {calculateRecommendedWater()}ml)</span>
            </h3>

            <div className="water-buttons">
              <button onClick={addWaterGlass}>+250ml</button>
              <button onClick={resetWaterIntake}>Reset</button>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search within diet plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="diet-right">
          <div className="tabs">
            <button className={activeTab === "recommendations" ? "active" : ""} onClick={() => setActiveTab("recommendations")}>
              Meal Plan
            </button>

            <button className={activeTab === "favorites" ? "active" : ""} onClick={() => setActiveTab("favorites")}>
              Favorites ({favorites.length})
            </button>

            {nutritionSummary && (
              <button className={activeTab === "nutrition" ? "active" : ""} onClick={() => setActiveTab("nutrition")}>
                Nutrition
              </button>
            )}
          </div>

          {/* TAB PANELS */}
          <div className="tab-content">
            {/* RECOMMENDATIONS */}
            {activeTab === "recommendations" && (
              <div className="pane">
                {recommendations.length > 0 ? (
                  <>
                    <button className="export-btn" onClick={exportToPDF}>
                      Export PDF
                    </button>

                    {recommendations
                      .filter((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((rec, i) => (
                        <div key={i} className="diet-card">
                          <p>{rec}</p>
                          <button
                            className="fav-btn"
                            disabled={favorites.includes(rec)}
                            onClick={() => addToFavorites(rec)}
                          >
                            {favorites.includes(rec) ? "❤️ Saved" : "🤍 Save"}
                          </button>
                        </div>
                      ))}
                  </>
                ) : (
                  <p className="empty-msg">Enter details & click Generate Plan</p>
                )}
              </div>
            )}

            {/* FAVORITES */}
            {activeTab === "favorites" && (
              <div className="pane">
                {favorites.length > 0 ? (
                  favorites.map((item, i) => (
                    <div key={i} className="diet-card">
                      <p>{item}</p>
                      <button className="remove-btn" onClick={() => removeFromFavorites(item)}>
                        ❌ Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="empty-msg">No favorites added.</p>
                )}
              </div>
            )}

            {/* NUTRITION SUMMARY */}
            {activeTab === "nutrition" && nutritionSummary && (
              <div className="pane">
                <pre className="nutrition-box">{nutritionSummary}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
