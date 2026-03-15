const fs = require("node:fs");
const path = require("node:path");

function normalizeExtendedPath(input) {
  if (typeof input !== "string") return input;
  if (input.startsWith("\\\\?\\")) return input.slice(4);
  return input;
}

function hasPackageJson(dir) {
  if (!dir) return false;
  try {
    return fs.existsSync(path.join(dir, "package.json"));
  } catch {
    return false;
  }
}

function resolveProjectRoot() {
  const candidates = [
    process.env.npm_config_local_prefix,
    process.env.INIT_CWD,
    process.env.npm_package_json ? path.dirname(process.env.npm_package_json) : null,
    process.cwd(),
  ]
    .map(normalizeExtendedPath)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (hasPackageJson(candidate)) {
      return candidate;
    }
  }

  return normalizeExtendedPath(process.cwd());
}

module.exports = {
  resolveProjectRoot,
};
