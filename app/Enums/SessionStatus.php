<?php

namespace App\Enums;

enum SessionStatus: string
{
    case DRAFT = 'draft';
    case OPEN = 'open';
    case CLOSED = 'closed';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draf (Belum Dimulai)',
            self::OPEN => 'Dibuka (Sedang Berlangsung)',
            self::CLOSED => 'Ditutup (Selesai)',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    public function canTransitionTo(SessionStatus $target): bool
    {
        return match ($this) {
            self::DRAFT => in_array($target, [self::OPEN, self::CANCELLED]),
            self::OPEN => in_array($target, [self::CLOSED, self::CANCELLED]),
            self::CLOSED => false, // Cannot reopen without strict supervisor override
            self::CANCELLED => false,
        };
    }
}
