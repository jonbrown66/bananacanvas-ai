const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveProjectRoot } = require("./resolve-project-root.cjs");

function buildNextArgs(command, extraArgs = []) {
  return [command, ...extraArgs];
}

function runNext(command, extraArgs = []) {
  const projectRoot = resolveProjectRoot();
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextBin, ...buildNextArgs(command, extraArgs)], {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });

  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(runNext(process.argv[2] || "dev", process.argv.slice(3)));
}

module.exports = runNext;
module.exports.buildNextArgs = buildNextArgs;
