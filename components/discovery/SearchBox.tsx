import { Search } from 'lucide-react';

export default function SearchBox() {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      className="hidden sm:flex items-center gap-1.5 bg-cyber-violet-light border border-[#3A3E70] rounded-xl px-3 py-1.5 focus-within:border-neo-mint/60 transition-all"
    >
      <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
      <input
        type="search"
        name="q"
        placeholder="Search questions"
        aria-label="Search questions"
        className="bg-transparent outline-none text-xs text-slate-200 placeholder:text-slate-500 w-28 md:w-44 focus:w-40 md:focus:w-64 transition-all"
      />
    </form>
  );
}
