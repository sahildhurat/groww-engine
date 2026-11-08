import React from "react";
import fs from "fs";
import path from "path";
import { FormattedText } from "@/components/FormattedText";

export const metadata = {
  title: "AI Evidence Log | SIP Continuity Discovery Engine",
  description: "Auditable record of what the engine read, agreement with researcher gold labels, and where AI output was rejected or corrected.",
};

interface TableCell {
  text: string;
  align: "left" | "center" | "right";
}

interface MarkdownBlock {
  type: "h1" | "h2" | "h3" | "p" | "ul" | "ol" | "table" | "hr";
  content?: string;
  items?: string[];
  headers?: TableCell[];
  rows?: TableCell[][];
}

function parseMarkdownToBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // HR
    if (trimmed === "---" || trimmed === "***") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // H1
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", content: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", content: trimmed.slice(3).trim() });
      i++;
      continue;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", content: trimmed.slice(4).trim() });
      i++;
      continue;
    }

    // Tables
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        const alignCells = tableLines[1]
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        const alignments: ("left" | "center" | "right")[] = alignCells.map((al) => {
          if (al.startsWith(":") && al.endsWith(":")) return "center";
          if (al.endsWith(":")) return "right";
          return "left";
        });

        const headers: TableCell[] = headerCells.map((h, idx) => ({
          text: h,
          align: alignments[idx] || "left",
        }));

        const rows: TableCell[][] = [];
        for (let rIdx = 2; rIdx < tableLines.length; rIdx++) {
          const cells = tableLines[rIdx]
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          rows.push(
            cells.map((cellText, cIdx) => ({
              text: cellText,
              align: alignments[cIdx] || "left",
            }))
          );
        }

        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    // Unordered lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        items.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, "").trim());
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraphs
    let para = trimmed;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ") &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      lines[i].trim() !== "---"
    ) {
      para += " " + lines[i].trim();
      i++;
    }
    blocks.push({ type: "p", content: para });
  }

  return blocks;
}

export default function EvidencePage() {
  const filePath = path.join(process.cwd(), "data", "evidence.md");
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    content = "# AI Evidence Log\n\nEvidence file not found.";
  }

  const blocks = parseMarkdownToBlocks(content);

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-6">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={idx}
                className="text-3xl font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-4 mb-6"
              >
                <FormattedText text={block.content || ""} />
              </h1>
            );
          case "h2":
            return (
              <h2
                key={idx}
                className="text-2xl font-bold tracking-tight text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200"
              >
                <FormattedText text={block.content || ""} />
              </h2>
            );
          case "h3":
            return (
              <h3 key={idx} className="text-lg font-semibold text-slate-900 mt-6 mb-2">
                <FormattedText text={block.content || ""} />
              </h3>
            );
          case "p":
            return (
              <p key={idx} className="text-sm leading-relaxed text-slate-700 my-3">
                <FormattedText text={block.content || ""} />
              </p>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-2 my-3 text-sm text-slate-700">
                {block.items?.map((it, itIdx) => (
                  <li key={itIdx} className="leading-relaxed">
                    <FormattedText text={it} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-2 my-3 text-sm text-slate-700">
                {block.items?.map((it, itIdx) => (
                  <li key={itIdx} className="leading-relaxed">
                    <FormattedText text={it} />
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div
                key={idx}
                className="overflow-x-auto my-6 border border-slate-200 rounded-lg shadow-sm"
              >
                <table className="min-w-full divide-y divide-slate-200 text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      {block.headers?.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className={`py-2.5 px-3 font-semibold ${
                            h.align === "right"
                              ? "text-right"
                              : h.align === "center"
                              ? "text-center"
                              : "text-left"
                          }`}
                        >
                          <FormattedText text={h.text} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {block.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/70">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 text-slate-800 ${
                              cell.align === "right"
                                ? "text-right font-mono"
                                : cell.align === "center"
                                ? "text-center font-mono"
                                : "text-left"
                            }`}
                          >
                            <FormattedText text={cell.text} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={idx} className="my-8 border-slate-200" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

