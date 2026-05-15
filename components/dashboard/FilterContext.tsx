'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface FilterState {
  clientId: string;
  plantId: string;
  failureName: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  clearFilters: () => void;
}

const defaultState: FilterState = {
  clientId: '',
  plantId: '',
  failureName: '',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultState);

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(defaultState);
  };

  return (
    <FilterContext.Provider value={{ filters, setFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useDashboardFilters must be used within a DashboardFilterProvider');
  }
  return context;
}
