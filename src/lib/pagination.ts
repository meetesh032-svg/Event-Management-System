/**
 * Standardized Pagination Helper
 */

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function buildPagination<T>(
  data: T[],
  totalCount: number,
  page: number = 1,
  pageSize: number = 12
): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));
  const totalPages = Math.ceil(totalCount / safePageSize);

  return {
    data,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalCount,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}
