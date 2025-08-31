import { useState, useEffect, useMemo } from 'react';

interface FilterOptions {
  status?: string;
  tier?: string;
  discountType?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface UseSearchFilterProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  filterFields?: {
    [K in keyof FilterOptions]: keyof T;
  };
}

export function useSearchFilter<T>({ 
  data, 
  searchFields, 
  filterFields = {} 
}: UseSearchFilterProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === 'number') {
            return value.toString().includes(query);
          }
          return false;
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([filterKey, filterValue]) => {
      if (!filterValue) return;

      const dataField = filterFields[filterKey as keyof FilterOptions];
      if (!dataField) return;

      switch (filterKey) {
        case 'status':
        case 'tier':
        case 'discountType':
          result = result.filter((item) => item[dataField] === filterValue);
          break;
        case 'minAmount':
          result = result.filter((item) => {
            const value = item[dataField] as number;
            return typeof value === 'number' && value >= (filterValue as number);
          });
          break;
        case 'maxAmount':
          result = result.filter((item) => {
            const value = item[dataField] as number;
            return typeof value === 'number' && value <= (filterValue as number);
          });
          break;
        case 'dateFrom':
          result = result.filter((item) => {
            const value = item[dataField] as Date | string;
            const itemDate = value instanceof Date ? value : new Date(value);
            const filterDate = new Date(filterValue as string);
            return itemDate >= filterDate;
          });
          break;
        case 'dateTo':
          result = result.filter((item) => {
            const value = item[dataField] as Date | string;
            const itemDate = value instanceof Date ? value : new Date(value);
            const filterDate = new Date(filterValue as string);
            return itemDate <= filterDate;
          });
          break;
      }
    });

    return result;
  }, [data, searchQuery, filters, searchFields, filterFields]);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    totalCount: data.length,
    filteredCount: filteredData.length
  };
}
