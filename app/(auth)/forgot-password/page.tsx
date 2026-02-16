'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleResetRequest = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  console.log("1. Attempting to save email:", email)

  // Save email as bridge for reset page
  localStorage.setItem('reset_email', email)

  // Immediately check if it actually saved
  console.log("2. Verified in storage:", localStorage.getItem('reset_email'))

  // Simulate API call
  await new Promise((r) => setTimeout(r, 1500))

  router.push('/forgot-password/sent')
  setIsLoading(false)
}

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto font-['Inter']">
      <div className="flex min-h-full">

        {/* ================= LEFT (CONTENT) ================= */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[650px] mx-auto px-6 py-12 md:px-12 lg:px-16 text-center">


            {/* Header */}
            <h1 className="text-[#1d395e] text-[34px] font-semibold mb-4">
              Forgot password?
            </h1>

            <p className="text-black text-base max-w-xs mx-auto mb-10">
              Enter your email address and we’ll send you instructions to reset your password.
            </p>

            {/* Form */}
            <form onSubmit={handleResetRequest} className="space-y-6 text-left">

              {/* Email */}
              <div>
                <label className="block text-black text-base font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-[50px] px-4 bg-white text-black rounded-[5px] shadow-sm border-2 border-[#d8dde1] focus:border-[#1e3a5f] outline-none transition-colors placeholder-[#666666] text-base"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[50px] bg-[#b93b53] hover:bg-[#a02f45] text-white rounded-[5px] text-base font-semibold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
              >
                {isLoading ? (
                  <Icon icon="mdi:loading" className="animate-spin text-xl" />
                ) : (
                  'Reset Password'
                )}
              </button>

              {/* Back to login */}
              <div className="text-center pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-black text-base font-normal hover:text-[#1e3a5f] transition-colors group"
                >
                  <Icon
                    icon="mdi:arrow-left"
                    className="text-xl group-hover:-translate-x-1 transition-transform"
                  />
                  Back to log in
                </Link>
              </div>

            </form>
          </div>
        </div>

        {/* ================= RIGHT (DECORATIVE) ================= */}
        <div className="hidden lg:block w-1/2 relative bg-[#1e3a5f] min-h-screen sticky top-0 h-screen">
          <img
            src="/auth-bg.png"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-bl from-[#7ca5bf]/50 to-[#1e3a5f]/90 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1e3a5f]" />
        </div>

      </div>
    </div>
  )
}
