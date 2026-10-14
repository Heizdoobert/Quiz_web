// Vercel cron sends `Authorization: Bearer $CRON_SECRET`. With no CRON_SECRET configured every
// request is denied.
export function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    if (authHeader.slice(7).trim() === cronSecret) return true;
  }

  try {
    if (new URL(req.url).searchParams.get('secret') === cronSecret) return true;
  } catch {
    // an unparseable URL is not authorized
  }
  return false;
}
