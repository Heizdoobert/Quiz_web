# app/admin/_modules/_template/README.md
lines:10 exports:
---
# Adding an admin module

1. Copy this folder to `app/admin/_modules/<id>/`. The id is kebab-case and becomes the URL: `/admin/<id>`. It must not match an existing folder in `app/admin/` (the generator fails if it does).
2. Edit `manifest.ts`: label, the permission that may open it, optional order.
3. Edit `page.tsx`. It is a server component and may be async. It receives `role` and `segments` (the URL after `/admin/<id>`).
4. Run `npm run gen:admin` (`npm run dev`, `build` and `test` do it for you) and commit the changed `registry.generated.ts`.

The module route checks the manifest permission before it loads your page, and the nav shows the link only to roles that hold it. Neither protects a write. A server action must call a service that runs `authorize()` itself, before it validates input, and must take no account argument (see `lib/actions/admin-actions.ts`). Keep a client component's data access out of the browser the same way.

Put the module's own components, actions and tests next to it. Folders starting with `_` are not modules.
