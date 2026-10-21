# components/admin/AdminNav.tsx
lines:14 exports:default
---
import Link from 'next/link';

// Renders the links it is given; which ones a role may see is decided by adminNavItems().
export default function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Admin" className="flex gap-4 border-b border-cyber-border px-6 py-3 text-sm font-heading">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
