import React from "react";
import colors from "../theme/colors.json";

const ANSI_COLORS: Record<string, Record<number, string>> = {
  light: {
    0: colors.text.secondary, // Black
    1: colors.status.error, // Red
    2: colors.status.success, // Green
    3: colors.status.warning, // Yellow
    4: colors.console.text.primary, // Blue
    5: colors.console.text.primary, // Magenta
    6: colors.console.text.primary, // Cyan
    7: colors.text.primary, // White
    // Bright variants
    8: colors.text.tertiary, // Bright Black
    9: colors.status.error, // Bright Red
    10: colors.status.success, // Bright Green
    11: colors.status.warning, // Bright Yellow
    12: colors.console.text.primary, // Bright Blue
    13: colors.console.text.primary, // Bright Magenta
    14: colors.console.text.primary, // Bright Cyan
    15: colors.text.primary, // Bright White
  },
  dark: {
    0: colors.text.secondary, // Black
    1: colors.status.error, // Red
    2: colors.status.success, // Green
    3: colors.status.warning, // Yellow
    4: colors.console.text.primary, // Blue
    5: colors.console.text.primary, // Magenta
    6: colors.console.text.primary, // Cyan
    7: colors.text.primary, // White
    // Bright variants
    8: colors.text.tertiary, // Bright Black
    9: colors.status.error, // Bright Red
    10: colors.status.success, // Bright Green
    11: colors.status.warning, // Bright Yellow
    12: colors.console.text.primary, // Bright Blue
    13: colors.console.text.primary, // Bright Magenta
    14: colors.console.text.primary, // Bright Cyan
    15: colors.text.primary, // Bright White
  },
};

interface AnsiParserProps {
  text: string;
}

interface SpanStyle {
  fontWeight?: "bold" | "normal";
  fontStyle?: "italic" | "normal";
  textDecoration?: "underline" | "none";
  color?: string;
  backgroundColor?: string;
}

interface Span {
  text: string;
  style: SpanStyle;
  isBadge?: boolean;
}

const ALLOWED_CHARS =
  /[a-zA-Z0-9\s\*\/\?\#\=\+\-\_\.\,\:\;\!\@\$\%\^\&\(\)\[\]\{\}\<\>\|\\\~\`\'\"]/;

const AnsiParser: React.FC<AnsiParserProps> = ({ text }) => {
  const parseAnsi = (input: string): Span[] => {
    const result: Span[] = [];
    let currentSpan: Span = { text: "", style: {} };
    let position = 0;

    while (position < input.length) {
      if (input[position] === "\u001b" && input[position + 1] === "[") {
        // If we have accumulated any text, push it
        if (currentSpan.text) {
          result.push({ ...currentSpan });
          currentSpan = { text: "", style: { ...currentSpan.style } };
        }

        position += 2; // Skip the escape sequence start
        let code = "";

        // Collect all numbers until 'm'
        while (position < input.length && input[position] !== "m") {
          code += input[position];
          position++;
        }
        position++; // Skip the 'm'

        // Process the code
        const codes = code.split(";").map(Number);
        for (let i = 0; i < codes.length; i++) {
          const code = codes[i];

          if (code === 0) {
            // Reset all attributes
            currentSpan.style = {};
          } else if (code === 1) {
            // Bold
            currentSpan.style.fontWeight = "bold";
          } else if (code === 2) {
            // Faint (not widely supported)
            // No direct CSS equivalent
          } else if (code === 3) {
            // Italic
            currentSpan.style.fontStyle = "italic";
          } else if (code === 4) {
            // Underline
            currentSpan.style.textDecoration = "underline";
          } else if (code === 22) {
            // Normal weight (not bold)
            currentSpan.style.fontWeight = "normal";
          } else if (code === 23) {
            // Not italic
            currentSpan.style.fontStyle = "normal";
          } else if (code === 24) {
            // Not underlined
            currentSpan.style.textDecoration = "none";
          } else if (code >= 30 && code <= 37) {
            // Foreground color
            currentSpan.style.color = ANSI_COLORS.light[code - 30];
          } else if (
            code === 38 &&
            codes[i + 1] === 5 &&
            i + 2 < codes.length
          ) {
            // 8-bit foreground color (38;5;n)
            const colorIndex = codes[i + 2];
            if (colorIndex < 16) {
              currentSpan.style.color = ANSI_COLORS.light[colorIndex];
            }
            i += 2; // Skip the next two codes we just processed
          } else if (code === 39) {
            // Default foreground color
            delete currentSpan.style.color;
          } else if (code >= 40 && code <= 47) {
            // Background color
            currentSpan.style.backgroundColor = `${ANSI_COLORS.light[code - 40]}20`;
          } else if (
            code === 48 &&
            codes[i + 1] === 5 &&
            i + 2 < codes.length
          ) {
            // 8-bit background color (48;5;n)
            const colorIndex = codes[i + 2];
            if (colorIndex < 16) {
              currentSpan.style.backgroundColor = `${ANSI_COLORS.light[colorIndex]}20`;
            }
            i += 2; // Skip the next two codes we just processed
          } else if (code === 49) {
            // Default background color
            delete currentSpan.style.backgroundColor;
          } else if (code >= 90 && code <= 97) {
            // Bright foreground color
            currentSpan.style.color = ANSI_COLORS.light[code - 82];
          } else if (code >= 100 && code <= 107) {
            // Bright background color
            currentSpan.style.backgroundColor = `${ANSI_COLORS.light[code - 92]}20`;
          }
        }
      } else {
        // Filter out unwanted characters
        if (ALLOWED_CHARS.test(input[position])) {
          currentSpan.text += input[position];
        }
        position++;
      }
    }

    // Push any remaining text
    if (currentSpan.text) {
      result.push(currentSpan);
    }

    return result;
  };

  const processSpans = (spans: Span[]): Span[] => {
    const processedSpans: Span[] = [];

    for (let i = 0; i < spans.length; i++) {
      const span = { ...spans[i] };

      // Process [INFO] badges
      if (span.text.includes("[INFO]")) {
        // Split by [INFO] and process each part
        const parts = span.text.split(/(\[INFO\])/);

        for (let j = 0; j < parts.length; j++) {
          if (parts[j] === "[INFO]") {
            processedSpans.push({
              text: "INFO",
              style: { ...span.style },
              isBadge: true,
            });
          } else if (parts[j]) {
            processedSpans.push({
              text: parts[j],
              style: { ...span.style },
            });
          }
        }
      }
      // Process text with asterisks to make them bold
      else if (span.text.includes("*")) {
        // Process sequences like ** or *** to make text bold
        let currentText = span.text;
        let result = "";
        let inBold = false;
        let asteriskCount = 0;

        for (let j = 0; j < currentText.length; j++) {
          if (currentText[j] === "*") {
            asteriskCount++;

            // If we have 2 or 3 consecutive asterisks, toggle bold state
            if (
              asteriskCount >= 2 &&
              (j === currentText.length - 1 || currentText[j + 1] !== "*")
            ) {
              if (result) {
                processedSpans.push({
                  text: result,
                  style: {
                    ...span.style,
                    fontWeight: inBold ? "bold" : undefined,
                  },
                });
                result = "";
              }

              inBold = !inBold;
              asteriskCount = 0;
            }
          } else {
            if (asteriskCount > 0) {
              // Add any pending asterisks as regular text
              result += "*".repeat(asteriskCount);
              asteriskCount = 0;
            }
            result += currentText[j];
          }
        }

        // Add any remaining text
        if (result) {
          processedSpans.push({
            text: result,
            style: {
              ...span.style,
              fontWeight: inBold ? "bold" : undefined,
            },
          });
        }
      } else {
        processedSpans.push(span);
      }
    }

    return processedSpans;
  };

  const spans = processSpans(parseAnsi(text));

  return (
    <div
      className="font-mono leading-5 whitespace-pre-wrap"
      style={{ color: colors.console.text.primary }}
    >
      {spans.map((span, index) =>
        span.isBadge ? (
          <span
            key={index}
            className="inline-flex items-center justify-center px-2 py-0.5 mx-1 text-xs font-medium rounded"
            style={{
              backgroundColor: colors.background.tertiary,
              color: colors.text.primary,
            }}
          >
            {span.text}
          </span>
        ) : (
          <span
            key={index}
            style={{
              ...span.style,
              fontFamily: "Coinbase Mono, monospace",
              backgroundColor: span.style.backgroundColor
                ? `${span.style.backgroundColor}20`
                : undefined,
            }}
          >
            {span.text}
          </span>
        ),
      )}
    </div>
  );
};

export default AnsiParser;
