import React, { useEffect, useState, useRef } from "react";
// Uncomment the following imports for full map functionality
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Ensure Leaflet is imported properly

// Importing icons from lucide-react for better visual consistency
import { Search, MapPin, List, Map, Crosshair, Info, Phone, ArrowRight, X } from 'lucide-react';

// Re-defining the Fa (Font Awesome) components to use Lucide icons for consistency and better rendering
const FaSearch = () => <Search size={20} />;
const FaMapMarkerAlt = () => <MapPin size={20} />;
const FaList = () => <List size={20} />;
const FaMap = () => <Map size={20} />;
const FaCrosshairs = () => <Crosshair size={20} />;
const FaInfoCircle = () => <Info size={20} />;
const FaPhone = () => <Phone size={20} />;
const FaMapSigns = () => <ArrowRight size={20} />;
const FaTimes = () => <X size={20} />;


// Custom Red Marker Icon for Hospitals (using data URL directly in Leaflet)
// Custom hospital icon
const hospitalIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2967/2967350.png",
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});
// Custom Blue Marker Icon for User Location
const userIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", // a blue pin
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});



// Custom Blue Marker Icon for User Location (using data URL directly in Leaflet)
// Custom hospital icon


// Component to control map view (re-center, zoom)
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function HospitalsNearMe() {
  const [position, setPosition] = useState(null); // User's current position [lat, lon]
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("map"); // 'map' or 'list'
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default: India center
  const [mapZoom, setMapZoom] = useState(6); // Default zoom for country view
  const [statusMessage, setStatusMessage] = useState({ show: false, type: '', message: '' }); // For status messages

  const searchInputRef = useRef(null); // Ref for search input focus

  // Helper function to display status messages
  const showStatusMessage = (type, message, duration = 3000) => {
    setStatusMessage({ show: true, type, message });
    setTimeout(() => {
      setStatusMessage({ show: false, type: '', message: '' });
    }, duration);
  };

  // 1. Get User's Geolocation on initial load
  useEffect(() => {
    setLoading(true);
    showStatusMessage('info', 'Finding your location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setPosition(coords);
          setMapCenter(coords); // Center map on user
          setMapZoom(13); // Zoom in on user
          fetchHospitals(coords); // Fetch hospitals near this location
          showStatusMessage('success', 'Location found!');
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLoading(false);
          // Only show error message if user explicitly denied or there's a serious error
          if (err.code === 1) { // PERMISSION_DENIED
              showStatusMessage('error', `Please enable location services to use "My Location".`);
          } else {
              showStatusMessage('error', `Geolocation error: ${err.message}. Showing default location.`);
          }
          fetchHospitals(mapCenter); // Fetch hospitals near default location
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options for geolocation
      );
    } else {
      setLoading(false);
      showStatusMessage('error', 'Geolocation not supported by your browser. Showing default location.');
      fetchHospitals(mapCenter); // Fetch hospitals near default location
    }
  }, []); // Run only once on mount

  // Function to fetch hospitals using Nominatim API
  const fetchHospitals = async (coords, query = "hospital") => {
    setLoading(true);
    setHospitals([]); // Clear previous hospitals
    showStatusMessage('info', `Searching for "${query}" near ${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}...`);
    try {
      // Nominatim search with bounding box prioritizing results within it (bounded=1)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&addressdetails=1&bounded=1&viewbox=${coords[1] - 0.1},${coords[0] + 0.1},${coords[1] + 0.1},${coords[0] - 0.1}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'HospitalApp/1.0 (your-email@example.com)' } // Good practice for Nominatim
      });
      if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
      const data = await res.json();

      if (data.length > 0) {
        setHospitals(data.filter(item => item.lat && item.lon)); // Filter out items without coordinates
        showStatusMessage('success', `Found ${data.length} results for "${query}"`);
      } else {
        setHospitals([]);
        showStatusMessage('info', `No results found for "${query}" near this location.`);
      }
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      showStatusMessage('error', `Failed to fetch hospitals: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search by query
  const handleSearchSubmit = () => {
    if (searchQuery.trim() === "") {
      showStatusMessage('info', 'Please enter a search query.');
      return;
    }
    fetchHospitals(position || mapCenter, searchQuery); // Use user's current position or default
  };

  // Handle "My Location" button click
// Handle "My Location" button click
const handleMyLocation = () => {
  setLoading(true);
  showStatusMessage('info', 'Finding your current location...');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        console.log("Detected Location:", coords); // ✅ Debug log

        // Update state
        setPosition(coords);
        setMapCenter(coords);
        setMapZoom(14); // Zoom closer to user location

        // Fetch hospitals near detected location
        fetchHospitals(coords, searchQuery || "hospital");

        showStatusMessage('success', 'Map centered on your location!');
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error on re-center:", err);
        setLoading(false);

        if (err.code === 1) { // PERMISSION_DENIED
          showStatusMessage('error', `Please enable location services to re-center.`);
        } else {
          showStatusMessage('error', 'Could not re-center on your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,  // ✅ Forces GPS if available
        timeout: 15000,            // Waits longer for better accuracy
        maximumAge: 0,             // Prevents cached (old/wrong) location
      }
    );
  } else {
    setLoading(false);
    showStatusMessage('error', 'Geolocation not supported by your browser.');
  }
};

// ✅ Manual Search Function (backup if GPS fails)
const searchLocation = async (query) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
    );
    const data = await res.json();

    if (data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      setPosition(coords);
      setMapCenter(coords);
      setMapZoom(14);
      fetchHospitals(coords, "hospital");

      showStatusMessage('success', `Map centered on ${query}`);
    } else {
      showStatusMessage('error', `Location "${query}" not found.`);
    }
  } catch (error) {
    console.error("Search error:", error);
    showStatusMessage('error', 'Failed to fetch searched location.');
  }
};


  // Handle clicking on a hospital in the list view
  const handleListItemClick = (lat, lon) => {
    setMapCenter([parseFloat(lat), parseFloat(lon)]);
    setMapZoom(16); // Zoom closer to the selected hospital
    setViewMode('map'); // Switch to map view
    showStatusMessage('info', 'Centering map on selected hospital.');
  };

  const getDirectionsLink = (lat, lon) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}${position ? `&origin=${position[0]},${position[1]}` : ''}`;
  };

  return (
    <>
      {/* Embedded CSS for styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        :root {
          --primary-blue: #007bff;
          --primary-blue-hover: #0056b3;
          --accent-green: #28a745;
          --accent-green-hover: #218838;
          --card-bg: #ffffff;
          --text-color: #333;
          --border-color: #e0e0e0;
          --shadow-light: rgba(0,0,0,0.08);
          --shadow-medium: rgba(0,0,0,0.15);
          --status-success-bg: #4CAF50;
          --status-error-bg: #f44336;
          --status-info-bg: #2196F3;
          --status-text-color: white;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: #f4f7f6; /* Light background for the overall app */
        }

        .hospitals-container {
	width: 130%;
            display: flex;
            flex-direction: column; /* Stack vertically by default */
            min-height: calc(100vh - 64px - 40px); /* Account for AppBar height and some padding */
            padding: 20px;
            box-sizing: border-box;
            gap: 20px;
            overflow: auto; /* Allow scrolling if content overflows */
            max-width: 1200px; /* Consistent with previous settings */
            margin: 0 auto; /* Center the container horizontally */
            background-color: var(--card-bg); /* Give the container a card background */
            border-radius: 12px; /* Rounded corners */
            box-shadow: 0 4px 15px var(--shadow-light); /* Soft shadow */
        }

        .map-card, .list-card {
            background: var(--card-bg); /* Ensure cards have white background */
            border-radius: 12px;
            box-shadow: 0 4px 15px var(--shadow-light);
            padding: 25px;
            flex: 1; /* Allow cards to grow */
            display: flex;
            flex-direction: column;
            overflow: hidden; /* For map border-radius */
            min-height: 50vh; /* Half of the viewport height */
            position: relative;
            border: 1px solid var(--border-color); /* Add a subtle border */
        }

        .map-card h2, .list-card h2 {
            font-size: 1.8rem;
            color: var(--text-color);
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .leaflet-container {
          flex-grow: 1;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          z-index: 0;
          height: 50vh; /* Half screen height */
          }

        .controls-panel {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            align-items: center;
            justify-content: center; /* Center controls */
        }

        .search-input {
            flex: 1;
            min-width: 200px;
            padding: 12px 15px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            outline: none;
        }
        .search-input:focus {
            border-color: var(--primary-blue);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
        }

        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 5px var(--shadow-light);
            color: white;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px var(--shadow-medium);
        }
        .btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        .btn-primary {
            background-color: var(--primary-blue);
        }
        .btn-primary:hover:not(:disabled) {
            background-color: var(--primary-blue-hover);
        }

        .btn-secondary {
            background-color: #6c757d;
        }
        .btn-secondary:hover:not(:disabled) {
            background-color: #5a6268;
        }

        .btn-accent {
            background-color: var(--accent-green);
        }
        .btn-accent:hover:not(:disabled) {
            background-color: var(--accent-green-hover);
        }

        /* Loading Spinner */
        .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            min-height: 200px;
            color: var(--text-color);
            text-align: center;
        }
        .loader {
            border: 6px solid var(--border-color);
            border-top: 6px solid var(--primary-blue);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Hospital List */
        .hospital-list {
            list-style: none;
            padding: 0;
            margin: 0;
            max-height: calc(100vh - 300px); /* Adjust based on header/footer */
            overflow-y: auto;
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
        }

        .hospital-list-item {
            background-color: #f9f9f9;
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            transition: background-color 0.2s ease, transform 0.2s ease;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .hospital-list-item:hover {
            background-color: #e9e9e9;
            transform: translateX(5px);
        }

        .hospital-list-item h3 {
            margin: 0 0 8px 0;
            color: var(--primary-blue);
            font-size: 1.2rem;
            font-weight: 700;
        }

        .hospital-list-item p {
            margin: 0 0 5px 0;
            font-size: 0.95rem;
            color: var(--text-color-light);
        }
        .hospital-list-item .distance {
            font-weight: 600;
            color: var(--accent-green);
        }

        .hospital-list-item .details-btn {
            background-color: #007bff;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 0.9rem;
            text-decoration: none;
            align-self: flex-end; /* Align to the right */
        }
        .hospital-list-item .details-btn:hover {
            background-color: #0056b3;
        }

        /* Status Message */
        .status-message {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 25px;
          border-radius: 8px;
          color: var(--status-text-color);
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          z-index: 1000;
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
          opacity: 0; /* Hidden by default */
        }
        .status-message.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .status-message.success { background-color: var(--status-success-bg); }
        .status-message.error { background-color: var(--status-error-bg); }
        .status-message.info { background-color: var(--status-info-bg); }
        .status-message .close-btn {
          background: none;
          border: none;
          color: var(--status-text-color);
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: 10px;
          padding: 0 5px;
        }
        .status-message span {
          vertical-align: middle;
        }

        /* Horizontal Hospital Preview Section */
        .horizontal-hospitals-scroll-section {
            margin-top: 20px; /* Space from map card above */
            padding: 20px;
            background: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 15px var(--shadow-light);
            border: 1px solid var(--border-color);
            display: flex; /* Make it a flex container */
            flex-direction: column; /* Stack heading and scrollable area */
        }

        .horizontal-hospitals-scroll-section h2 {
            font-size: 1.6rem;
            color: var(--text-color);
            margin-top: 0;
            margin-bottom: 15px;
            font-weight: 700;
            text-align: center;
        }

        .horizontal-hospitals-container {
            display: flex;
            overflow-x: auto; /* Enable horizontal scrolling */
            gap: 20px; /* Space between cards */
            padding-bottom: 10px; /* Space for scrollbar */
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
            scrollbar-width: thin; /* Firefox scrollbar */
            scrollbar-color: var(--primary-blue) #e0e0e0; /* Firefox scrollbar color */
            align-items: stretch; /* Ensure cards stretch to fill height */
        }

        /* Customize scrollbar for Webkit browsers */
        .horizontal-hospitals-container::-webkit-scrollbar {
            height: 8px;
        }
        .horizontal-hospitals-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        .horizontal-hospitals-container::-webkit-scrollbar-thumb {
            background: var(--primary-blue);
            border-radius: 10px;
        }
        .horizontal-hospitals-container::-webkit-scrollbar-thumb:hover {
            background: var(--primary-blue-hover);
        }

        .hospital-preview-card {
            flex-shrink: 0; /* Prevent cards from shrinking */
            width: 280px; /* Fixed width for each card */
            background-color: #f9f9f9;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between; /* Push button to bottom */
            border: 1px solid #eee;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            min-height: 140px; /* Min height for consistent appearance */
            max-height: 160px; /* Max height to prevent excessive growth */
            box-sizing: border-box; /* Include padding in height */
            overflow: hidden; /* Hide overflowing text */
        }

        .hospital-preview-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .hospital-preview-card h3 {
            margin-top: 0;
            font-size: 1.1rem;
            color: var(--primary-blue);
            margin-bottom: 5px;
            white-space: nowrap; /* Prevent title from wrapping */
            overflow: hidden; /* Hide overflow */
            text-overflow: ellipsis; /* Add ellipsis */
            flex-shrink: 0; /* Prevent title from shrinking */
        }
        .hospital-preview-card p {
            font-size: 0.85rem;
            color: var(--text-color);
            margin-bottom: 5px;
            display: flex;
            align-items: flex-start; /* Align text to top */
            gap: 5px;
            flex-grow: 1; /* Allow paragraph content to take space */
            line-height: 1.3; /* Tighter line height */
            word-break: break-word; /* Ensure long words break */
            overflow: hidden; /* Hide overflow for content */
            text-overflow: ellipsis; /* Add ellipsis for content */
            display: -webkit-box; /* For multi-line ellipsis */
            -webkit-line-clamp: 2; /* Limit to 2 lines */
            -webkit-box-orient: vertical;
        }
        .hospital-preview-card .btn {
            margin-top: 10px;
            width: 100%;
            background-color: var(--accent-green);
            font-size: 0.9rem;
            padding: 8px 10px;
            box-shadow: none; /* Remove extra shadow */
            text-decoration: none; /* Ensure it looks like a button */
            flex-shrink: 0; /* Prevent button from shrinking */
        }
        .hospital-preview-card .btn:hover {
            background-color: var(--accent-green-hover);
        }

        /* Responsive Adjustments */
        @media (min-width: 769px) {
            .hospitals-container {
                flex-direction: column; /* Keep map and horizontal list stacked */
                height: auto;
            }
            .map-card {
                min-height: 500px; /* Larger map height on desktop */
            }
            .horizontal-hospitals-scroll-section {
                padding: 25px;
            }
            .hospital-preview-card {
                width: 300px; /* Slightly wider cards on desktop */
                min-height: 150px; /* Adjusted min-height for desktop */
                max-height: 170px; /* Adjusted max-height for desktop */
            }
        }

        @media (max-width: 768px) {
            .hospitals-container {
                padding: 15px;
                gap: 15px;
                min-height: auto;
            }
            .map-card, .list-card {
                padding: 20px;
                min-height: 300px;
            }
            .horizontal-hospitals-scroll-section {
                padding: 15px;
            }
            .hospital-preview-card {
                width: 250px; /* Adjust width for smaller screens */
                min-height: 130px; /* Adjusted min-height for mobile */
                max-height: 150px; /* Adjusted max-height for mobile */
            }
            .map-card h2, .list-card h2 {
                font-size: 1.5rem;
                margin-bottom: 15px;
            }
            .controls-panel {
                flex-direction: column;
                gap: 10px;
                align-items: stretch;
            }
            .search-input, .btn {
                width: 100%;
                min-width: unset;
            }
        }

        /* --- Mobile View (≤480px) --- */
@media (max-width: 480px) {

  .hospitals-container {
    display: flex;
    flex-direction: column; /* Stack vertically for better readability */
    padding: 10px;
    width: 80%;
  }

  .map-card {
    width: 100%;
    min-height: 350px; /* Optimized height for small screens */
    border-radius: 12px;
    overflow: hidden;
  }

  .leaflet-container {
    width: 100%;
    height: 100%; /* Full height inside map-card */
    min-height: 300px; /* Prevent too small map */
  }

  .hospital-preview-card {
    width: 100%; /* Full width on mobile */
    min-height: 100px;
    max-height: 140px;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    font-size: 14px; /* Slightly smaller text */
  }

  /* Optional: make text & buttons adapt */
  .hospital-preview-card h3 {
    font-size: 16px;
  }

  .hospital-preview-card button {
    font-size: 13px;
    padding: 6px 12px;
  }
}

      `}</style>

      {/* Status Message Display */}
      <div className={`status-message ${statusMessage.type} ${statusMessage.show ? 'show' : ''}`}>
        {statusMessage.type === 'success' && <span>✔️</span>}
        {statusMessage.type === 'error' && <span>❌</span>}
        {statusMessage.type === 'info' && <span>ℹ️</span>}
        <span>{statusMessage.message}</span>
        <button className="close-btn" onClick={() => setStatusMessage({ type: '', message: '' })}>✖️</button>
      </div>

      <div className="hospitals-container">
        {/* Map View Card */}
        {viewMode === "map" && (
          <div className="map-card">
            <h2><FaMapMarkerAlt /> Hospitals Map</h2>
            <div className="controls-panel">
              <input
                type="text"
                className="search-input"
                placeholder="Search for hospitals or clinics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                disabled={loading}
                ref={searchInputRef}
              />
              <button className="btn btn-primary" onClick={handleSearchSubmit} disabled={loading}>
                <FaSearch /> Search
              </button>
              <button className="btn btn-secondary" onClick={handleMyLocation} disabled={loading}> {/* Removed || !position to allow trying geolocation even if position is null */}
                <FaCrosshairs /> My Location
              </button>
              <button className="btn btn-accent" onClick={() => setViewMode("list")}> {/* Removed disabled condition */}
                <FaList /> View List ({hospitals.length})
              </button>
            </div>

            {loading ? (
              <div className="loader-container">
                <div className="loader"></div>
                <p>Loading hospitals...</p>
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={mapZoom} className="leaflet-container">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // Default OSM tiles
                />
                <MapController center={mapCenter} zoom={mapZoom} /> {/* Re-centers map dynamically */}

                {position && (
                  <Marker position={position} icon={userIcon}>
                    <Popup>You are here</Popup>
                    </Marker>
                              )}
{hospitals.map((h, idx) => (
  h.lat && h.lon && ( // ✅ ensure coords exist
    <Marker
      key={h.osm_id || idx}
      position={[h.lat, h.lon]}
      icon={hospitalIcon} // ✅ use hospital symbol here
    >
      <Popup>
        <div className="popup-content">
          <h3>{h.tags?.name || h.address?.name || h.display_name?.split(",")[0] || "Hospital"}</h3>

          {/* Address info */}
          {h.address?.road && (
            <p>
              <FaMapMarkerAlt /> {h.address.road},{" "}
              {h.address.city || h.address.town || h.address.village}
            </p>
          )}

          {/* Postal code */}
          {h.address?.postcode && <p>Zip: {h.address.postcode}</p>}

          {/* Phone number */}
          {h.address?.phone && (
            <p>
              <FaPhone /> {h.address.phone}
            </p>
          )}

          {/* Website */}
          {h.extratags?.website && (
            <p>
              <a
                href={h.extratags.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            </p>
          )}

          {/* Directions button */}
          <a
            href={getDirectionsLink(h.lat, h.lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary details-btn"
          >
            <FaMapSigns /> Get Directions
          </a>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            )}

            {/* Horizontal Hospital Preview Cards below the Map */}
            {hospitals.length > 0 && (
                <div className="horizontal-hospitals-scroll-section">
                    <h2>Hospitals Nearby</h2>
                    <div className="horizontal-hospitals-container">
                        {hospitals.map((h, idx) => (
                            h.lat && h.lon && (
                                <div className="hospital-preview-card" key={`preview-${h.osm_id || idx}`}>
                                    <h3>{h.address?.name || h.display_name.split(',')[0] || "Hospital"}</h3>
                                    {/* Using Lucide icons now */}
                                    {h.address?.road && <p><MapPin size={16} /> {h.address.road}</p>}
                                    {h.address?.city && <p><MapPin size={16} /> {h.address.city || h.address.town || h.address.village}</p>}
                                    {h.address?.phone && <p><Phone size={16} /> {h.address.phone}</p>}
                                    <a
                                        href={getDirectionsLink(h.lat, h.lon)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn"
                                    >
                                        <ArrowRight size={20} /> Get Directions
                                    </a>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}

        {/* List View Card (remains as a separate view) */}
        {viewMode === "list" && (
          <div className="list-card">
            <h2><FaList /> Nearby Hospitals ({hospitals.length})</h2>
            <div className="controls-panel">
              <button className="btn btn-primary" onClick={() => setViewMode("map")}>
                <FaMap /> View Map
              </button>
              <button className="btn btn-secondary" onClick={() => setHospitals([])}>
                <FaTimes /> Clear List
              </button>
            </div>
            {loading ? (
              <div className="loader-container">
                <div className="loader"></div>
                <p>Loading list...</p>
              </div>
            ) : hospitals.length > 0 ? (
              <ul className="hospital-list">
                {hospitals.map((h, idx) => (
                  h.lat && h.lon && (
                    <li key={h.osm_id || idx} className="hospital-list-item" onClick={() => handleListItemClick(h.lat, h.lon)}>
                      <h3>{h.address?.name || h.display_name.split(',')[0] || "Hospital"}</h3>
                      {/* Using Lucide icons now */}
                      {h.address?.road && <p><MapPin size={16} /> {h.address.road}, {h.address.city || h.address.town || h.address.village}</p>}
                      {h.address?.postcode && <p><X size={16} /> Zip: {h.address.postcode}</p>}
                      {h.address?.phone && <p><Phone size={16} /> Phone: {h.address.phone}</p>}
                      {h.distance && <p className="distance">Distance: {h.distance.toFixed(2)} km</p>}
                      <a
                        href={getDirectionsLink(h.lat, h.lon)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary details-btn"
                        onClick={(e) => e.stopPropagation()} // Prevent list item click from firing
                      >
                        <FaMapSigns /> Get Directions
                      </a>
                    </li>
                  )
                ))}
              </ul>
            ) : (
              <p className="loader-container">No hospitals found. Try searching or check location permissions.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
