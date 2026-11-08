import React from "react";

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Renders bold and italic markdown markers safely without HTML injection.
 */
export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  // Split by bold (**...**)
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const inner = part.slice(2, -2);
          // Check for italics inside bold
          const italicParts = inner.split(/(\*.*?\*)/g);
          return (
            <strong key={index} className="font-semibold text-slate-900">
              {italicParts.map((ip, i) =>
                ip.startsWith("*") && ip.endsWith("*") ? (
                  <em key={i} className="italic">
                    {ip.slice(1, -1)}
                  </em>
                ) : (
                  ip
                )
              )}
            </strong>
          );
        } else {
          // Check for italics in regular text
          const italicParts = part.split(/(\*.*?\*)/g);
          return (
            <React.Fragment key={index}>
              {italicParts.map((ip, i) =>
                ip.startsWith("*") && ip.endsWith("*") ? (
                  <em key={i} className="italic text-slate-800">
                    {ip.slice(1, -1)}
                  </em>
                ) : (
                  ip
                )
              )}
            </React.Fragment>
          );
        }
      })}
    </span>
  );
}


/** A markdown pipe table: header, separator, rows. */
function isTableBlock(lines: string[]): boolean {
  return lines.length >= 2 && lines.every((l) => l.trim().startsWith("|")) && /^\|\s*:?-{3,}/.test(lines[1].trim());
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/**
 * Renders findings text: paragraphs through FormattedText, and markdown pipe tables as real tables (the audit found
 * them shown as raw pipes, which made counts such as "684 | 435" read as "684684").
 */
export function MarkdownBlocks({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (isTableBlock(lines)) {
          const head = cells(lines[0]);
          const rows = lines.slice(2).map(cells);
          return (
            <div key={bi} className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-slate-600">
                    {head.map((h, i) => (
                      <th key={i} scope="col" className="py-1.5 pr-3 font-semibold border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri} className="border-b border-slate-100 last:border-0 align-top">
                      {r.map((c, ci) => (
                        <td key={ci} className={`py-1.5 pr-3 ${ci === 0 ? "text-slate-900 font-medium" : "text-slate-700 tabular-nums"}`}>
                          <FormattedText text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={bi} className="whitespace-pre-line">
            <FormattedText text={lines.join("\n")} />
          </p>
        );
      })}
    </div>
  );
}
