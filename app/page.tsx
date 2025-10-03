'use client'

import { useState } from 'react'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)

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

            <form className="space-y-4">
              <div>
                <label htmlFor="email" className="text-label block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-label block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                  placeholder="••••••••"
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
                    className="w-full px-3 py-2 border border-border focus:outline-none focus:border-border-strong rounded-sm"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-black text-white py-2 px-4 text-emphasis hover:bg-gray-800 transition-colors rounded-sm"
              >
                {isLogin ? 'log in' : 'sign up'}
              </button>
            </form>

            {isLogin && (
              <div className="mt-4 text-center">
                <a href="#" className="text-metadata hover:text-black">
                  forgot your password?
                </a>
              </div>
            )}
          </div>
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
