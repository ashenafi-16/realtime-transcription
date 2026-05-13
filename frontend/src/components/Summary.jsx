import React from "react";

// Parses Claude's response into two sections
function parseSummary(text) {
  const keyPoints = [];
  const actionItems = [];

  const lines = text.split("\n");
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("KEY POINTS:")) {
      currentSection = "keyPoints";
    } else if (trimmed.startsWith("ACTION ITEMS:")) {
      currentSection = "actionItems";
    } else if (trimmed.startsWith("-") && currentSection === "keyPoints") {
      keyPoints.push(trimmed.slice(1).trim());
    } else if (trimmed.startsWith("-") && currentSection === "actionItems") {
      actionItems.push(trimmed.slice(1).trim());
    }
  }

  return { keyPoints, actionItems };
}

export default function Summary({ summary, status }) {
  // --- Loading state ---
  if (status === "processing") {
    return (
      <div style={styles.wrapper}>
        <h2 style={styles.title}>✨ AI Summary</h2>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>
            Claude is analyzing your transcript...
          </p>
        </div>

        {/* Spinner animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // --- Empty state ---
  if (!summary) {
    return (
      <div style={styles.wrapper}>
        <h2 style={styles.title}>✨ AI Summary</h2>
        <div style={styles.emptyBox}>
          <span style={styles.emptyIcon}>🤖</span>
          <p style={styles.emptyText}>
            Your AI-generated summary will appear here after you stop recording
          </p>
        </div>
      </div>
    );
  }

  // --- Parse and display summary ---
  const { keyPoints, actionItems } = parseSummary(summary);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>✨ AI Summary</h2>

      <div style={styles.cardsRow}>

        {/* Key Points Card */}
        <div style={{ ...styles.card, borderTop: "4px solid #6366f1" }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>💡</span>
            <h3 style={styles.cardTitle}>Key Points</h3>
            <span style={{ ...styles.badge, backgroundColor: "#e0e7ff", color: "#4338ca" }}>
              {keyPoints.length}
            </span>
          </div>

          {keyPoints.length === 0 ? (
            <p style={styles.noItems}>No key points found</p>
          ) : (
            <ul style={styles.list}>
              {keyPoints.map((point, index) => (
                <li key={index} style={styles.listItem}>
                  <span style={{ ...styles.bullet, backgroundColor: "#6366f1" }} />
                  <span style={styles.itemText}>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Items Card */}
        <div style={{ ...styles.card, borderTop: "4px solid #22c55e" }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>✅</span>
            <h3 style={styles.cardTitle}>Action Items</h3>
            <span style={{ ...styles.badge, backgroundColor: "#dcfce7", color: "#15803d" }}>
              {actionItems.length}
            </span>
          </div>

          {actionItems.length === 0 ? (
            <p style={styles.noItems}>No action items found</p>
          ) : (
            <ul style={styles.list}>
              {actionItems.map((item, index) => (
                <li key={index} style={styles.listItem}>
                  <span style={{ ...styles.bullet, backgroundColor: "#22c55e" }} />
                  <span style={styles.itemText}>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

// --- Styles ---
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "100%",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    margin: 0,
    color: "#1e1b4b",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "2.5rem",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    minHeight: "150px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: "0.95rem",
    color: "#6b7280",
    margin: 0,
  },
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "2.5rem",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    minHeight: "150px",
  },
  emptyIcon: {
    fontSize: "2.5rem",
  },
  emptyText: {
    fontSize: "0.95rem",
    color: "#9ca3af",
    textAlign: "center",
    margin: 0,
    maxWidth: "300px",
  },
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  cardIcon: {
    fontSize: "1.1rem",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: "700",
    margin: 0,
    color: "#1e1b4b",
    flex: 1,
  },
  badge: {
    fontSize: "0.8rem",
    fontWeight: "700",
    padding: "0.15rem 0.6rem",
    borderRadius: "999px",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
  },
  bullet: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginTop: "6px",
    flexShrink: 0,
  },
  itemText: {
    fontSize: "0.9rem",
    color: "#374151",
    lineHeight: "1.6",
  },
  noItems: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    margin: 0,
    fontStyle: "italic",
  },
};