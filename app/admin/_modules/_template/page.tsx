import type { AdminModuleProps } from '../types';

// The route has already authorized the manifest permission and passes the caller's role.
export default function TemplatePage({ segments }: AdminModuleProps) {
  return (
    <section>
      <h1 className="text-2xl font-black font-heading text-white mb-1">Template</h1>
      <p className="text-sm text-slate-300">{segments.length ? `Sub-path: ${segments.join('/')}` : 'Replace this page.'}</p>
    </section>
  );
}
