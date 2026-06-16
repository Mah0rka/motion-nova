import { useEffect, useMemo, useState } from "react";

import { filterBySearch } from "../lib/search";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, pageItems, total: items.length };
}

export function useSearchPagination<T>(
  items: T[],
  searchTerm: string,
  toHaystack: (item: T) => string,
  pageSize = 10
) {
  const filtered = useMemo(
    () => filterBySearch(items, searchTerm, toHaystack),
    [items, searchTerm, toHaystack]
  );
  return { filtered, ...usePagination(filtered, pageSize) };
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="table-pagination-controls">
      <button
        className="ghost-link"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Попередня сторінка
      </button>
      <span className="table-pagination-label">
        Сторінка {page} із {totalPages}
      </span>
      <button
        className="ghost-link"
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Наступна сторінка
      </button>
    </div>
  );
}
