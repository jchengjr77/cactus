'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const { user, signIn, signUp, signOut, resetPassword } = useAuth()

  // If user is authenticated, show a simple dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-3xl text-header mb-4 text-brand">
              welcome back
            </h1>
            <p className="text-body text-gray-600 mb-6">
              logged in as {user.email}
            </p>
            <p className="text-metadata mb-8">
              dashboard coming soon...
            </p>
            <button
              onClick={() => signOut()}
              className="bg-surface border border-border px-4 py-2 text-emphasis hover:bg-gray-200 transition-colors rounded-sm"
            >
              log out
            </button>
          </div>
        </main>
        <a
          href="https://github.com/jchengjr77/cactus"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 text-metadata hover:text-black transition-colors"
        >
          github
        </a>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isLogin && password !== confirmPassword) {
      setError('passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) {
        setError(error.message)
      } else if (!isLogin) {
        // Signup successful
        setSignupSuccess(true)
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError('an unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await resetPassword(resetEmail)

      if (error) {
        setError(error.message)
      } else {
        setResetSuccess(true)
        setResetEmail('')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl text-header mb-3 tracking-tight text-brand">
              cactus
            </h1>
            <p className="text-body text-gray-600">
              water your friendships.
            </p>
          </div>

          {signupSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700">
              <h3 className="text-emphasis mb-2">check your email</h3>
              <p className="text-body text-green-600">
                We've sent you a confirmation link. Please confirm your email to log in.
              </p>
              <button
                onClick={() => {
                  setSignupSuccess(false)
                  setIsLogin(true)
                }}
                className="mt-3 text-metadata hover:text-green-800 underline"
              >
                back to login
              </button>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700">
              <h3 className="text-emphasis mb-2">password reset sent</h3>
              <p className="text-body text-green-600">
                We've sent you a password reset link. Please check your email and follow the instructions.
              </p>
              <button
                onClick={() => {
                  setResetSuccess(false)
                  setShowForgotPassword(false)
                }}
                className="mt-3 text-metadata hover:text-green-800 underline"
              >
                back to login
              </button>
            </div>
          )}

          {showForgotPassword && !resetSuccess && (
            <div className="bg-surface border border-border p-6 rounded">
              <h2 className="text-header mb-4">reset password</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-body">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleForgotPassword}>
                <div>
                  <label htmlFor="resetEmail" className="text-label block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="resetEmail"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-2 px-4 text-emphasis hover:bg-gray-800 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'sending...' : 'send reset link'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-metadata hover:text-black"
                >
                  back to login
                </button>
              </div>
            </div>
          )}

          {!signupSuccess && !showForgotPassword && !resetSuccess && (
            <div className="bg-surface border border-border p-6 rounded">
            <div className="flex mb-6 bg-gray-100 border border-border p-1 rounded-sm">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 text-emphasis transition-colors rounded-sm ${
                  isLogin
                    ? 'bg-white text-black border border-border'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                log in
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 text-emphasis transition-colors rounded-sm ${
                  !isLogin
                    ? 'bg-white text-black border border-border'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                sign up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-body">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="text-label block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="text-label block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="text-label block mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-2 px-4 text-emphasis hover:bg-gray-800 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'processing...' : (isLogin ? 'log in' : 'sign up')}
              </button>
            </form>

            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-metadata hover:text-black"
                >
                  forgot your password?
                </button>
              </div>
            )}
            </div>
          )}
        </div>
      </main>
      <a
        href="https://github.com/jchengjr77/cactus"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-metadata hover:text-black transition-colors"
      >
        github
      </a>
    </div>
  );
}
