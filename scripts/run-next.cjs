const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveProjectRoot } = require("./resolve-project-root.cjs");

function runNext(command) {
  const projectRoot = resolveProjectRoot();
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextBin, command, projectRoot], {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });

  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(runNext(process.argv[2] || "dev"));
}

module.exports = runNext;
