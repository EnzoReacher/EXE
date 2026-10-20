// Reuses the project's CSS line-icon primitives; no font or network dependency.
export default function WorkbenchIcon({ name = "document" }: { name?: "document" | "account" | "scan" | "arrow" | "check" | "edit" | "menu" }) {
  if (name === "document" || name === "account") return <span aria-hidden="true" className={`nav-icon nav-icon-${name === "account" ? "flow" : "report"}`} />;
  return <span aria-hidden="true" className="op-symbol">{{ scan: "↗", arrow: "→", check: "✓", edit: "✎", menu: "☰" }[name]}</span>;
}
