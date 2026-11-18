import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
  triggerIcon?: React.ReactNode;
  triggerLabel?: string;
  className?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  align = 'right',
  triggerIcon = <MoreVertical className="w-4 h-4" />,
  triggerLabel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);

  // Menu digambar di document.body (portal) dengan posisi tetap, agar tidak terpotong oleh tabel/kartu
  // yang memakai overflow-hidden (dulu menu tidak terlihat bila tabel hanya berisi 1-2 baris).
  const place = () => {
    const btn = menuRef.current?.getBoundingClientRect();
    if (!btn) return;
    const width = 192; // w-48
    const height = dropRef.current?.offsetHeight || items.length * 40 + 12;
    const up = btn.bottom + 8 + height > window.innerHeight && btn.top - 8 - height > 0;
    let left = align === 'right' ? btn.right - width : btn.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: up ? btn.top - 8 - height : btn.bottom + 8, left, up });
  };

  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (menuRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const close = () => setIsOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
      >
        {triggerIcon}
        {triggerLabel && <span className="text-xs font-semibold ml-1.5">{triggerLabel}</span>}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropRef}
          role="menu"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className={`w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-[60] py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                item.variant === 'danger'
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {item.icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

