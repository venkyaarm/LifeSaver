// App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QRGenerator from "./pages/QRGenerator";
import Account from "./pages/Account";
import Settings from "./pages/Settings";
import AskDoctor from "./pages/AskDoctor";
import TabletAndTonicAnalysis from "./pages/TabletAndTonicAnalysis";
import SkinCare from "./pages/SkinCare";
import Emergency from "./pages/Emergency";
import HospitalsNearMe from "./pages/HospitalsNearMe";
import ReportAnalysis from "./pages/ReportAnalysis";
import FoodOrDietRecommendation from "./pages/FoodOrDietRecommendation";

// Components
import PrivateRoute from "./components/PrivateRoute";
import SidebarLayout from "./components/Sidebar";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes inside Sidebar */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <SidebarLayout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="qrgenerator" element={<QRGenerator />} />
          <Route path="account" element={<Account />} />
          <Route path="settings" element={<Settings />} />
          <Route path="askdoctor" element={<AskDoctor />} />
          <Route path="tabletandtonicanalysis" element={<TabletAndTonicAnalysis />} />
          <Route path="skincare" element={<SkinCare />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="hospitalsnearme" element={<HospitalsNearMe />} />
          <Route path="reportanalysis" element={<ReportAnalysis />} />
          <Route path="foodordietrecommendation" element={<FoodOrDietRecommendation />} />
        </Route>

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
