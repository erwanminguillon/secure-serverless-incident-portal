import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { setAdminSession } from "./adminSession";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [adminKey, setAdminKey] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!adminKey.trim()) {
      setError("Admin key is required.");
      return;
    }

    setAdminSession(adminKey.trim(), adminName.trim() || "Admin");
    navigate("/admin/incidents");
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
              color: "#001E3B",
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
              color: "#53657A",
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
              title="Protected API"
              text="Admin endpoints require a valid administrator key."
            />
            <InfoTile
              title="Session scoped"
              text="The key is kept only in browser session storage."
            />
            <InfoTile
              title="SOC workflow"
              text="Triage, investigate, resolve, close, or reject incidents."
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
              color: "#001E3B",
              fontSize: "26px",
              letterSpacing: "-0.03em",
            }}
          >
            Administrator access
          </h3>

          <p
            style={{
              margin: "0 0 22px",
              color: "#53657A",
              fontSize: "14px",
              lineHeight: 1.55,
            }}
          >
            Enter your admin key to continue. The key is not baked into the
            frontend and is cleared when the browser session ends or when you
            log out.
          </p>

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
                placeholder="Admin display name"
              />
              <p className="ssip-help-text" style={{ margin: "6px 0 0" }}>
                This name is used when creating internal comments.
              </p>
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
                placeholder="Paste admin key"
                autoComplete="off"
              />
              <p className="ssip-help-text" style={{ margin: "6px 0 0" }}>
                The backend validates this key against the configured admin key
                hash.
              </p>
            </div>

            <button
              type="submit"
              className="ssip-button ssip-button-primary"
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "11px 14px",
              }}
            >
              Continue to dashboard
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
              border: "1px solid var(--ssip-border)",
              borderRadius: "10px",
              background: "#f8fbfe",
              color: "#004578",
              padding: "14px",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            If access fails, verify that the admin key matches the Azure
            Function App setting <code>ADMIN_SHARED_KEY_HASH</code>.
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
      <h4
        style={{
          margin: "0 0 6px",
          color: "#001E3B",
          fontSize: "15px",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          color: "#53657A",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        {text}
      </p>
    </div>
  );
}