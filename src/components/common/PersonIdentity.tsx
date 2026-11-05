import React from 'react';
import { PersonAvatar } from './PersonAvatar';

export interface PersonIdentityProps {
  name: string;
  code: string; // NIS or NIP/Nomor SDM
  subtext?: string;
  photoUrl?: string | null;
  gender?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const PersonIdentity: React.FC<PersonIdentityProps> = ({
  name,
  code,
  subtext,
  photoUrl,
  gender,
  size = 'md',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 min-w-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <PersonAvatar
        name={name}
        photoUrl={photoUrl}
        gender={gender}
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`font-semibold text-zinc-900 dark:text-zinc-100 truncate ${
            onClick ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors' : ''
          } ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
        >
          {name}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 truncate">
          <span className="font-mono">{code}</span>
          {subtext && (
            <>
              <span>•</span>
              <span className="truncate">{subtext}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
