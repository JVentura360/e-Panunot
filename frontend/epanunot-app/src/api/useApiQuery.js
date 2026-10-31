import { useQuery } from '@tanstack/react-query';
import { apiQueryOptions } from './client.js';

export function useApiQuery(path, options = {}) {
  const { query, ...settings } = options;
  return useQuery({ ...apiQueryOptions(path, { query }), ...settings });
}
