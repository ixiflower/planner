import React from 'react';
import { cn } from '@/lib/utils';

interface ResizableGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ResizableGrid({ children, className }: ResizableGridProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {children}
    </div>
  );
}

export default ResizableGrid;
