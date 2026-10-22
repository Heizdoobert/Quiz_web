import React from 'react';
import { System } from '@/lib/supabaseClient';

type Props = {
  system: System;
  canControl: boolean;
  onAction: (action: string) => void;
};

export default function SystemCard({ system, canControl, onAction }: Props) {
  const statusColor = system.status?.healthy ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className="border rounded-lg p-4 shadow-sm w-full max-w-md mb-4">
      <h2 className="text-xl font-semibold mb-2">{system.name}</h2>
      <p className="text-sm text-gray-600 mb-2">Type: {system.type}</p>
      <div className="flex items-center mb-2">
        <span className="mr-2 text-sm font-medium">Status:</span>
        <span className={`inline-block w-3 h-3 rounded-full ${statusColor}`} />
      </div>
      {canControl && (
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-deepOrange text-white rounded"
            onClick={() => onAction('restart')}
          >
            Restart
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={() => onAction('stop')}
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
