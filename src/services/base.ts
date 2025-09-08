export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}