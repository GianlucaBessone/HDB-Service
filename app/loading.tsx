'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow background */}
        <div className="absolute w-16 h-16 rounded-full bg-primary/20 animate-ping-slow" />
        <div className="relative p-4 bg-primary/10 rounded-2xl border border-primary/20 backdrop-blur-md">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h3 className="font-semibold text-lg text-foreground tracking-tight">
          Cargando sección
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Por favor espere un momento mientras preparamos la información.
        </p>
      </div>
    </div>
  );
}
