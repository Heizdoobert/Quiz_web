import { expect, test } from "vitest";
import { NextRequest } from "next/server";
import { POST as signIn } from "@/app/api/v1/auth/signin/route";

test("POST /api/v1/auth/signin sets JWT and refresh cookies", async () => {
  const req = new NextRequest("http://example.com/api/v1/auth/signin", {
    method: "POST",
    json: {
      username: "testuser",
      password: "testpass",
    },
  });

  const res = await signIn(req);
  expect(res.status).toBe(200);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const hasJwt = cookies.some((c) => c.startsWith("jwt="));
  const hasRefresh = cookies.some((c) => c.startsWith("refresh="));
  expect(hasJwt).toBe(true);
  expect(hasRefresh).toBe(true);
});
