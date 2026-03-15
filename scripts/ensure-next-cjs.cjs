const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { resolveProjectRoot } = require("./resolve-project-root.cjs");

const projectRoot = resolveProjectRoot();
const nextDir = path.join(projectRoot, ".next");
const pkgPath = path.join(nextDir, "package.json");
const depsHashPath = path.join(nextDir, ".deps-hash");
const lockfilePath = path.join(projectRoot, "pnpm-lock.yaml");
const expected = JSON.stringify({ type: "commonjs" }, null, 2) + "\n";

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function computeDepsHash() {
  const lockContent = safeReadFile(lockfilePath);
  if (!lockContent) return null;
  return crypto.createHash("sha1").update(lockContent).digest("hex");
}

function clearNextDir(reason) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    fs.mkdirSync(nextDir, { recursive: true });
    if (reason) {
      console.log(reason);
    }
  } catch (error) {
    console.warn("Failed to clear stale .next cache:", error?.message || error);
  }
}

function ensureNextDirFresh() {
  const nextExists = fs.existsSync(nextDir);
  const currentHash = computeDepsHash();

  if (!nextExists) {
    fs.mkdirSync(nextDir, { recursive: true });
    if (currentHash) {
      fs.writeFileSync(depsHashPath, currentHash, "utf8");
    }
    return;
  }

  if (!currentHash) {
    return;
  }

  const previousHash = safeReadFile(depsHashPath)?.toString("utf8").trim();
  if (!previousHash) {
    const hasBuildArtifacts =
      fs.existsSync(path.join(nextDir, "server")) || fs.existsSync(path.join(nextDir, "static"));
    if (hasBuildArtifacts) {
      clearNextDir("Initialized dependency hash. Cleared existing .next cache once for safety.");
    }
    fs.writeFileSync(depsHashPath, currentHash, "utf8");
    return;
  }

  if (previousHash !== currentHash) {
    clearNextDir("Detected dependency lock change. Cleared stale .next cache.");
  }

  fs.writeFileSync(depsHashPath, currentHash, "utf8");
}

ensureNextDirFresh();

let current = null;
if (fs.existsSync(pkgPath)) {
  current = fs.readFileSync(pkgPath, "utf8");
}

if (current !== expected) {
  fs.writeFileSync(pkgPath, expected, "utf8");
  console.log("Ensured .next/package.json uses commonjs.");
}
