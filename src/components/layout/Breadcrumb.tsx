import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-zinc-500 font-medium ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <span className="flex items-center text-zinc-400 hover:text-zinc-600 transition-colors">
            <Home className="w-3.5 h-3.5" />
          </span>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className={`transition-colors cursor-pointer ${
                  item.active ? 'text-zinc-900 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {item.label}
              </button>
            ) : item.href ? (
              <a
                href={item.href}
                className={`transition-colors ${
                  item.active ? 'text-zinc-900 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {item.label}
              </a>
            ) : (
              <span className={item.active ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

