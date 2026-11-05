import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { User as UserType } from '../../types';
import { Button } from '../ui/Button';
import { Input, FormField } from '../ui/Input';
import { Checkbox } from '../ui/Select';
import { AuthLayout } from '../layout/AuthLayout';

export interface LoginPageProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; user?: UserType; message?: string }>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  isLoading = false,
  errorMessage: propErrorMessage = null,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeError = propErrorMessage || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setLocalError('Username atau email wajib diisi.');
      return;
    }

    if (!cleanPassword) {
      setLocalError('Kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogin(cleanUsername, cleanPassword, rememberMe);
      if (!res.success) {
        setLocalError(res.message || 'Username atau password tidak sesuai.');
      }
    } catch {
      setLocalError('Terjadi gangguan saat memverifikasi kredensial. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6 max-w-md w-full mx-auto">
        {/* Mobile Top Brand Header */}
        <div className="flex lg:hidden items-center gap-3 pb-3 border-b border-zinc-200">
          <div className="w-10 h-10 rounded-2xl bg-[#C9A227] text-white font-black flex items-center justify-center text-lg shadow-sm shrink-0">
            UB
          </div>
          <div>
            <h1 className="text-base font-extrabold text-zinc-900 leading-tight">SIUBA</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Sistem Informasi Utsman Bin Affan
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Masuk ke SIUBA
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600">
            Masukkan kredensial akun Anda untuk mengakses sistem presensi & operasional pesantren.
          </p>
        </div>

        {/* Error Banner */}
        {activeError && (
          <div
            id="login-error-banner"
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-2xs"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email atau Username" required htmlFor="login-username">
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder="nama@utsman.sch.id atau username"
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="username"
              required
            />
          </FormField>

          <FormField label="Kata Sandi" required htmlFor="login-password">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1.5 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
          </FormField>

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              label="Ingat saya di perangkat ini"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <button
              type="button"
              onClick={() => {
                alert('Silakan hubungi Super Admin / Tim IT Pesantren untuk mereset kata sandi Anda.');
              }}
              className="text-xs font-bold text-[#1F5C45] hover:underline cursor-pointer"
            >
              Lupa sandi?
            </button>
          </div>

          <Button
            id="btn-login-submit"
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading || isSubmitting}
            loadingText="Memverifikasi Kredensial..."
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="mt-2"
          >
            Masuk ke Aplikasi
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};
