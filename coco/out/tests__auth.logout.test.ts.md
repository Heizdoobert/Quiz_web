# tests/auth.logout.test.ts
lines:17 exports:
---
import { expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST as logout } from "@/app/api/v1/auth/logout/route";

test("POST /api/v1/auth/logout clears auth cookies", async () => {
  const req = new NextRequest("http://example.com/api/v1/auth/logout", {
    method: "POST",
  });

  const res = await logout(req);
  expect(res.status).toBe(200);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const jwtCleared = cookies.find((c) => c.startsWith("jwt="));
  const refreshCleared = cookies.find((c) => c.startsWith("refresh="));
  expect(jwtCleared?.includes("Max-Age=0")).toBe(true);
  expect(refreshCleared?.includes("Max-Age=0")).toBe(true);
});
