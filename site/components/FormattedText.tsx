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

