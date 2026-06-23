const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "node_modules", "magic-string", "dist");
const esmFile = path.join(distDir, "magic-string.es.mjs");

try {
  if (!fs.existsSync(distDir)) {
    console.warn("magic-string is not installed yet; skipping patch.");
    process.exit(0);
  }

  if (fs.existsSync(esmFile)) {
    process.exit(0);
  }

  const content = `import * as cjs from "./magic-string.cjs.js";

const resolved = cjs.default ?? cjs;

export default resolved;
export const MagicString = cjs.MagicString ?? resolved.MagicString;
export const Bundle = cjs.Bundle ?? resolved.Bundle;
export const SourceMap = cjs.SourceMap ?? resolved.SourceMap;
`;

  fs.writeFileSync(esmFile, content, "utf8");
  console.warn("Patched magic-string.es.mjs for Tailwind ESM import.");
} catch (error) {
  console.error("Failed to patch magic-string:", error);
  process.exit(1);
}
