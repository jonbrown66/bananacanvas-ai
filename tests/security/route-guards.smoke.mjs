import assert from "node:assert/strict";
import {
  sanitizeNextPath,
  normalizeSuccessUrl,
  isSupabaseAuthCookieName
} from "../../lib/security/route-guards.js";

function run() {
  assert.equal(sanitizeNextPath("/app"), "/app");
  assert.equal(sanitizeNextPath("//evil.example"), "/app");
  assert.equal(sanitizeNextPath("https://evil.example"), "/app");

  assert.equal(
    normalizeSuccessUrl("/app?tab=billing", "https://bananacanvas.ai"),
    "https://bananacanvas.ai/app?tab=billing"
  );
  assert.equal(
    normalizeSuccessUrl("https://bananacanvas.ai/app", "https://bananacanvas.ai"),
    "https://bananacanvas.ai/app"
  );
  assert.equal(
    normalizeSuccessUrl("https://evil.example/phish", "https://bananacanvas.ai"),
    null
  );

  assert.equal(isSupabaseAuthCookieName("sb-abc-auth-token"), true);
  assert.equal(isSupabaseAuthCookieName("sb-abc-auth-token.0"), true);
  assert.equal(isSupabaseAuthCookieName("session"), false);

  console.log("security smoke checks passed");
}

run();
