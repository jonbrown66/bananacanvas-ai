const fs = require("fs");
const path = require("path");

const root = process.cwd();
const hasPnpmLock = fs.existsSync(path.join(root, "pnpm-lock.yaml"));
const hasNpmLock = fs.existsSync(path.join(root, "package-lock.json"));
const hasYarnLock = fs.existsSync(path.join(root, "yarn.lock"));

if (!hasPnpmLock) {
  console.error("Missing pnpm-lock.yaml.");
  process.exit(1);
}

if (hasNpmLock || hasYarnLock) {
  console.error("Only pnpm lockfile is allowed. Please remove package-lock.json/yarn.lock.");
  process.exit(1);
}

console.log("Package manager lockfile check passed.");
