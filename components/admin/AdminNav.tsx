import Link from 'next/link';
import { ADMIN_PAGES } from '@/lib/constants/admin-pages';
import { can } from '@/lib/services/rbac';

// Only the pages the role may open; a convenience, never the check (each page authorizes).
export default function AdminNav({ role }: { role: string }) {
  return (
    <nav aria-label="Admin" className="flex gap-4 border-b border-cyber-border px-6 py-3 text-sm font-heading">
      {ADMIN_PAGES.filter((page) => can(role, page.permission)).map((page) => (
        <Link key={page.href} href={page.href} className="text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint">
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
