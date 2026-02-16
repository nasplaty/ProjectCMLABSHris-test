'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { API_URL } from "../../../utils/config";

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<'form' | 'success' | 'expired'>('form')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setView('expired')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    // 1. Retrieve the real email from storage
    const email = localStorage.getItem('reset_email')

    if (!email) {
      alert('Session expired. Please try the "Forgot Password" process again.')
      router.push('/forgot-password')
      return
    }

    setIsLoading(true)

    try {
      // 2. Send request to backend
      const res = await fetch(`${config.API_URL}/auth/force-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email, 
          newPassword: newPassword 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      // 3. Success! Clear storage and show success view
      localStorage.removeItem('reset_email')
      setView('success')

    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto font-['Inter']">
      <div className="flex min-h-full">

        {/* LEFT */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center bg-white">

          {/* ================= FORM VIEW ================= */}
          {view === 'form' && (
            <div className="w-full max-w-[650px] mx-auto px-6 py-12 md:px-12 lg:px-16 text-center">

              {/* Icon */}
              <div className="mx-auto w-[126px] h-[130px] bg-[#7ca6bf]/30 rounded-[60px] flex items-center justify-center mb-8 relative">
                <div className="absolute w-20 h-20 bg-[#7ca6bf]/20 rounded-full blur-xl" />
                <Icon icon="mdi:lock-reset" className="text-[#1e3a5f] text-[64px] relative z-10" />
              </div>

              <h1 className="text-[#1d395e] text-[34px] font-semibold mb-4">
                Set new password
              </h1>

              <p className="text-black text-base max-w-xs mx-auto mb-10">
                Your new password must be at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 text-left" noValidate>

                {/* New password */}
                <div>
                  <label className="block text-black text-base font-medium mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full h-[50px] px-4 rounded-[5px] border-2 border-[#d8dde1] focus:border-[#1e3a5f] outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7ca6bf]"
                    >
                      <Icon icon={showNewPassword ? 'mdi:eye-off' : 'mdi:eye'} width="22" />
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-black text-base font-medium mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full h-[50px] px-4 rounded-[5px] border-2 border-[#d8dde1] focus:border-[#1e3a5f] outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7ca6bf]"
                    >
                      <Icon icon={showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'} width="22" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#b93b53] hover:bg-[#a02f45] text-white rounded-[5px] text-base font-semibold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 mt-6"
                >
                  {isLoading ? (
                    <Icon icon="mdi:loading" className="animate-spin text-xl" />
                  ) : (
                    'Reset password'
                  )}
                </button>

                <div className="text-center pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-black hover:text-[#1e3a5f]"
                  >
                    <Icon icon="mdi:arrow-left" className="text-xl" />
                    Back to log in
                  </Link>
                </div>

              </form>
            </div>
          )}

          {/* ================= SUCCESS VIEW ================= */}
          {view === 'success' && (
            <div className="w-full max-w-[650px] mx-auto px-6 py-12 text-center">
              <div className="mx-auto w-[126px] h-[130px] bg-[#7ca6bf]/30 rounded-[60px] flex items-center justify-center mb-8 relative">
                <div className="absolute w-20 h-20 bg-[#7ca6bf]/20 rounded-full blur-xl" />
                <Icon icon="mdi:check-bold" className="text-[#1e3a5f] text-[48px] relative z-10" />
              </div>

              <h1 className="text-[#1d395e] text-[34px] font-semibold mb-4">
                Password reset
              </h1>

              <p className="text-black text-base max-w-xs mx-auto mb-10">
                Your password has been successfully reset.
              </p>

              <button
                onClick={() => router.push('/login')}
                className="w-full h-[50px] bg-[#b93b53] hover:bg-[#a02f45] text-white rounded-[5px] text-base font-semibold shadow-md"
              >
                Login now
              </button>
            </div>
          )}

          {/* ================= EXPIRED VIEW ================= */}
          {view === 'expired' && (
            <div className="w-full max-w-[650px] mx-auto px-6 py-12 text-center">
              <div className="mx-auto w-[126px] h-[130px] bg-[#7ca6bf]/30 rounded-[60px] flex items-center justify-center mb-8 relative">
                <div className="absolute w-20 h-20 bg-[#7ca6bf]/20 rounded-full blur-xl" />
                <Icon icon="mdi:clock-remove-outline" className="text-[#1e3a5f] text-[48px] relative z-10" />
              </div>

              <h1 className="text-[#1d395e] text-[34px] font-semibold mb-4">
                Link expired
              </h1>

              <p className="text-black text-base max-w-xs mx-auto mb-10">
                This reset link is invalid or has expired.
              </p>

              <button
                onClick={() => router.push('/login')}
                className="w-full h-[50px] bg-[#b93b53] hover:bg-[#a02f45] text-white rounded-[5px] text-base font-semibold shadow-md"
              >
                Back to login
              </button>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="hidden lg:block w-1/2 relative bg-[#1e3a5f] min-h-screen sticky top-0">
          <img
            src="/auth-bg.png"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-bl from-[#7ca5bf]/50 to-[#1e3a5f]/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1e3a5f]" />
        </div>

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}