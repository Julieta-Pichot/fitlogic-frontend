import { useMemo, useState } from 'react';

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const params = useMemo(() => ({ page, limit }), [page, limit]);

  return {
    page,
    limit,
    params,
    setPage,
    setLimit,
    resetPage: () => setPage(1),
  };
}
