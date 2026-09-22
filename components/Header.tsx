'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
      <h1 className="text-2xl font-bold text-blue-400">Quick Quiz</h1>
      <div className="flex items-center gap-4">
        <ConnectButton />
      </div>
    </header>
  );
}
