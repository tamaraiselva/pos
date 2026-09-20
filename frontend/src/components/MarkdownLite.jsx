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
        if (trimmed === "") return <div key={i} className="h-1.5" />;
        if (/^[-*•]\s*/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s*/, "");
          if (!content) return null;
          return (
            <div key={i} className="flex items-start gap-1.5 pl-1 py-0.5">
              <span className="text-indigo-500 font-bold shrink-0 leading-tight">•</span>
              <span className="flex-1 leading-normal">{renderInline(content, i)}</span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <div key={i} className="pl-1 py-0.5 leading-normal">
              {renderInline(trimmed, i)}
            </div>
          );
        }
        return <p key={i} className="leading-normal">{renderInline(line, i)}</p>;
      })}
    </div>
  );
}
