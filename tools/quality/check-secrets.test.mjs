import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedPlaceholderConnection } from "./secret-scanner-lib.mjs";

test("allows explicit placeholders only in documentation, examples, and tests", () => {
  assert.equal(
    isAllowedPlaceholderConnection(".env.example", "sigi_poa", "local_dev_password_not_secret"),
    true
  );
  assert.equal(
    isAllowedPlaceholderConnection("docs/development/QA_HARNESS.md", "USER", "PASSWORD"),
    true
  );
  assert.equal(
    isAllowedPlaceholderConnection("apps/backend/src/config.test.ts", "sigi_poa", "local_password"),
    true
  );
});

test("does not excuse production credentials merely because they contain common words", () => {
  assert.equal(
    isAllowedPlaceholderConnection("apps/backend/src/config.ts", "prod", "SuperPassword123"),
    false
  );
  assert.equal(
    isAllowedPlaceholderConnection("api/config.ts", "service", "local-admin-password"),
    false
  );
});
