'use client';

import { useState } from 'react';

export function usePagination<T>(entries: T[], pageSize: number) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEntries = entries.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return { totalPages, safePage, pagedEntries, goToPrevPage, goToNextPage };
}
