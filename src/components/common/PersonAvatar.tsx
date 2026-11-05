import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

export interface PersonAvatarProps {
  name: string;
  photoUrl?: string | null;
  gender?: 'male' | 'female' | 'L' | 'P' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({
  name,
  photoUrl,
  gender = 'male',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const isFemale = gender === 'female' || gender === 'P';
  const fallbackBg = isFemale
    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';

  // Get initials (up to 2 letters)
  const getInitials = (text: string) => {
    if (!text) return '?';
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl overflow-hidden font-medium flex-shrink-0 border ${sizeClasses[size]} ${fallbackBg} ${className}`}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={`Foto ${name}`}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
