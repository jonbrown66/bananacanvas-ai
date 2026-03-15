const fs = require("node:fs");
const path = require("node:path");
const { resolveProjectRoot } = require("./resolve-project-root.cjs");

const projectRoot = resolveProjectRoot();
const nextDir = path.join(projectRoot, ".next");
const pkgPath = path.join(nextDir, "package.json");
const expected = JSON.stringify({ type: "commonjs" }, null, 2) + "\n";

fs.mkdirSync(nextDir, { recursive: true });

let current = null;
if (fs.existsSync(pkgPath)) {
  current = fs.readFileSync(pkgPath, "utf8");
}

if (current !== expected) {
  fs.writeFileSync(pkgPath, expected, "utf8");
  console.log("Ensured .next/package.json uses commonjs.");
}
