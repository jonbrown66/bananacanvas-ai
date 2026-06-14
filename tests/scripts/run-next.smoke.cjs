const assert = require("node:assert/strict");
const { buildNextArgs } = require("../../scripts/run-next.cjs");

function run() {
  assert.deepEqual(buildNextArgs("build"), ["build"]);
  assert.deepEqual(buildNextArgs("start", ["-p", "3000"]), ["start", "-p", "3000"]);
  assert.deepEqual(buildNextArgs("dev", ["--turbo"]), ["dev", "--turbo"]);

  console.log("run-next smoke checks passed");
}

run();
