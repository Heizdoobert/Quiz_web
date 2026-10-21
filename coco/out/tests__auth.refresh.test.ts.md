# tests/auth.refresh.test.ts
lines:19 exports:
---
import { expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { signRefresh } from "@/lib/auth";

test("POST /api/v1/auth/refresh validates refresh cookie & issues new cookies", async () => {
  const validRefresh = signRefresh({ accountId: "test-account" }) ?? "";
  const req = new NextRequest("http://example.com/api/v1/auth/refresh", {
    method: "POST",
    headers: { cookie: `refresh=${validRefresh}` },
  });
  const res = await refresh(req);
  expect(res.status).toBe(200);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const hasJwt = cookies.some((c) => c.startsWith("jwt="));
  const hasRefresh = cookies.some((c) => c.startsWith("refresh="));
  expect(hasJwt).toBe(true);
  expect(hasRefresh).toBe(true);
});
