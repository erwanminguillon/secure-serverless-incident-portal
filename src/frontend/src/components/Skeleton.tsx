import type { CSSProperties, ReactNode } from "react";

type SkeletonBlockProps = {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: CSSProperties;
};

export function SkeletonBlock({
  width = "100%",
  height = "16px",
  borderRadius = "999px",
  style,
}: SkeletonBlockProps) {
  return (
    <div
      className="ssip-skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "grid", gap: "10px", ...style }}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          width={index === lines - 1 ? "72%" : "100%"}
          height="13px"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  children,
  style,
}: {
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      className="ssip-card"
      style={{
        padding: "22px",
        display: "grid",
        gap: "16px",
        ...style,
      }}
    >
      {children ?? (
        <>
          <SkeletonBlock width="34%" height="14px" />
          <SkeletonBlock width="70%" height="28px" borderRadius="10px" />
          <SkeletonText lines={3} />
        </>
      )}
    </section>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="ssip-table-wrapper" style={{ overflowX: "auto" }}>
      <div
        style={{
          minWidth: "760px",
          display: "grid",
          gap: "10px",
          padding: "14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr 1fr",
            gap: "12px",
          }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} height="18px" borderRadius="6px" />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr 1fr",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {Array.from({ length: 5 }).map((_, cellIndex) => (
              <SkeletonBlock
                key={cellIndex}
                height={cellIndex === 0 ? "34px" : "22px"}
                borderRadius="8px"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingBanner({
  title,
  message,
  elapsedSeconds,
}: {
  title: string;
  message: string;
  elapsedSeconds?: number;
}) {
  return (
    <div className="ssip-loading-banner">
      <div>
        <p className="ssip-loading-eyebrow">Working on it</p>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      {typeof elapsedSeconds === "number" && (
        <div className="ssip-loading-timer">
          <span>{elapsedSeconds}s</span>
          <small>elapsed</small>
        </div>
      )}
    </div>
  );
}