'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Suppress React 19 "Encountered a script tag" warning immediately before rendering
  // This is a known issue with next-themes and React 19 as it injects a script tag for FOUC prevention.
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' && 
        args[0].includes('Encountered a script tag while rendering React component')
      ) {
        return;
      }
      originalError(...args);
    };
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
