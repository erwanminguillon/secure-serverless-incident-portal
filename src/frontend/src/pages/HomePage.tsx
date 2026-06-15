import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="ssip-card" style={{ padding: "32px" }}>
      <p
        style={{
          margin: 0,
          color: "#0080FF",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Welcome
      </p>

      <h2
        style={{
          margin: "8px 0 10px",
          color: "#001E3B",
          fontSize: "32px",
          letterSpacing: "-0.03em",
        }}
      >
        Secure incident reporting and SOC triage
      </h2>

      <p
        style={{
          maxWidth: "760px",
          color: "#53657A",
          fontSize: "16px",
          lineHeight: 1.6,
        }}
      >
        SSIP allows users to submit security incidents, track report progress,
        and gives administrators a protected console for triage and response.
      </p>

      <div
        className="ssip-responsive-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginTop: "28px",
        }}
      >
        <HomeAction
          title="Submit an incident"
          text="Report a security incident, vulnerability, or suspicious activity."
          to="/submit"
        />

        <HomeAction
          title="Track a report"
          text="Use a public incident ID and tracking token to check report status."
          to="/track"
        />

        <HomeAction
          title="Admin console"
          text="Access protected SOC triage workflows and incident management."
          to="/admin"
        />
      </div>
    </section>
  );
}

function HomeAction({
  title,
  text,
  to,
}: {
  title: string;
  text: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        border: "1px solid #C9DEF5",
        borderRadius: "18px",
        background: "#F7FBFF",
        padding: "20px",
        textDecoration: "none",
      }}
    >
      <h3 style={{ margin: "0 0 8px", color: "#001E3B" }}>{title}</h3>
      <p style={{ margin: 0, color: "#53657A", lineHeight: 1.5 }}>{text}</p>
    </Link>
  );
}