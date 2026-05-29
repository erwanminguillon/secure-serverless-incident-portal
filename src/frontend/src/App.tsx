import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SubmitIncidentPage from "./pages/SubmitIncidentPage";
import TrackIncidentPage from "./pages/TrackIncidentPage";

import { AdminLoginPage } from "./features/admin/AdminLoginPage";
import { AdminIncidentListPage } from "./features/admin/AdminIncidentListPage";
import { AdminIncidentDetailPage } from "./features/admin/AdminIncidentDetailPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="ssip-app">
        <header className="ssip-shell ssip-header">
          <div className="ssip-header-top">
            <div className="ssip-brand">
              <span className="ssip-brand-kicker">
                Secure Serverless Incident Portal
              </span>
              <h1 className="ssip-brand-title">SSIP</h1>
              <p className="ssip-brand-subtitle">
                Secure incident submission, tracking, and SOC triage.
              </p>
            </div>
          </div>

          <nav className="ssip-nav" aria-label="Main navigation">
            <Link className="ssip-nav-link" to="/">
              Home
            </Link>
          </nav>
        </header>

        <main className="ssip-shell ssip-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/submit" element={<SubmitIncidentPage />} />
            <Route path="/track" element={<TrackIncidentPage />} />

            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/incidents" element={<AdminIncidentListPage />} />
            <Route
              path="/admin/incidents/:incidentId"
              element={<AdminIncidentDetailPage />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;