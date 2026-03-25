"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SearchContextType {
  activeFilters: string[];
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQueryState] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const addFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters(prev => [...prev, filter]);
    }
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const clearFilters = () => setActiveFilters([]);

  const setSearchQuery = (q: string) => {
    setSearchQueryState(q);
    if (pathname !== "/") {
      router.push("/");
    }
  };

  return (
    <SearchContext.Provider value={{ activeFilters, addFilter, removeFilter, clearFilters, searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
