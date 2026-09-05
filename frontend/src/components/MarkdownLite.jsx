/**
 * Minimal renderer for the markdown subset LLM responses actually use here:
 * **bold** spans, "- " / "1. " list lines, and paragraph breaks. Avoids pulling
 * in a full markdown library for what is otherwise plain-text AI summaries.
 */
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

export default function MarkdownLite({ text, className }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === "") return <div key={i} className="h-2" />;
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span>&bull;</span>
              <span>{renderInline(trimmed.replace(/^[-*]\s+/, ""), i)}</span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <div key={i} className="pl-1">
              {renderInline(trimmed, i)}
            </div>
          );
        }
        return <p key={i}>{renderInline(line, i)}</p>;
      })}
    </div>
  );
}
