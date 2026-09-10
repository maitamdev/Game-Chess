import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, validateLogin, validatePassword, verifyPassword } from "../lib/server/auth";

test("tài khoản dùng scrypt có salt và kiểm tra mật khẩu an toàn", () => {
  const encoded = hashPassword("correct horse battery");
  assert.match(encoded, /^scrypt\$/);
  assert.notEqual(encoded, hashPassword("correct horse battery"));
  assert.equal(verifyPassword("correct horse battery", encoded), true);
  assert.equal(verifyPassword("wrong password", encoded), false);
  assert.equal(validateLogin("  Minh_01 "), "minh_01");
  assert.throws(
    () => validatePassword("short"),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "INVALID_PASSWORD",
  );
});
