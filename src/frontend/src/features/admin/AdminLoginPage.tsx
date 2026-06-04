import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { adminLogin, getAdminMe } from "../../api/adminApi";
import { clearAdminSession, setAdminSession } from "./adminSession";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [adminKey, setAdminKey] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    clearAdminSession();

    if (!adminKey.trim()) {
      setError("Admin key is required.");
      return;
    }

    try {
      setLoading(true);

      await adminLogin(adminKey.trim(), adminName.trim() || "Admin");

      const identity = await getAdminMe();

      setAdminSession(identity.principalName);
      setAdminKey("");

      navigate("/admin/incidents");
    } catch (err) {
      clearAdminSession();

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Admin login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ssip-card" style={{ padding: "32px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 420px)",
          gap: "28px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            border: "1px solid var(--ssip-border)",
            borderLeft: "6px solid #0078d4",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "28px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#0078d4",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Protected access
          </p>

          <h2
            style={{
              margin: "10px 0 14px",
              color: "#001e3b",
              fontSize: "34px",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            SSIP Admin Console
          </h2>

          <p
            style={{
              margin: 0,
              color: "#53657a",
              fontSize: "15px",
              lineHeight: 1.65,
              maxWidth: "720px",
            }}
          >
            Use the internal SOC workspace to review submitted incidents,
            update status, assign reviewers, and record internal investigation
            notes.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginTop: "28px",
            }}
          >
            <InfoTile
              title="HttpOnly session"
              text="After login, the admin key is exchanged for a backend session cookie."
            />
            <InfoTile
              title="Server verified"
              text="The dashboard opens only after a session confirmation."
            />
            <InfoTile
              title="No key storage"
              text="The plaintext admin key is not stored in browser."
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid var(--ssip-border)",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "28px",
            alignSelf: "start",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#0078d4",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Sign in
          </p>

          <h3
            style={{
              margin: "8px 0 8px",
              color: "#001e3b",
              fontSize: "26px",
              letterSpacing: "-0.03em",
            }}
          >
            Administrator access
          </h3>

          {error && (
            <div
              className="ssip-alert ssip-alert-error"
              style={{ marginBottom: "18px" }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <label className="ssip-label" htmlFor="adminName">
                Display name
              </label>
              <input
                id="adminName"
                className="ssip-field"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                placeholder="Display name"
              />
            </div>

            <div>
              <label className="ssip-label" htmlFor="adminKey">
                Admin key
              </label>
              <input
                id="adminKey"
                className="ssip-field"
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Key"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ssip-button ssip-button-primary"
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "11px 14px",
              }}
            >
              {loading ? "Signing in..." : "Continue to dashboard"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--ssip-border)",
        borderRadius: "12px",
        background: "#f8fbfe",
        padding: "16px",
      }}
    >
      <h4 style={{ margin: "0 0 6px", color: "#001e3b", fontSize: "15px" }}>
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          color: "#53657a",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        {text}
      </p>
    </div>
  );
}