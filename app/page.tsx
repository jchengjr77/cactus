export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-6 tracking-tight">
              Welcome to Your App
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Build amazing applications with Next.js 14, TypeScript, Tailwind CSS, and Supabase.
              Everything you need to get started is already configured.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-black text-white px-8 py-3 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors shadow">
              Get Started
            </button>
            <button className="bg-surface text-foreground px-8 py-3 rounded-lg font-medium text-lg hover:bg-gray-200 transition-colors border border-gray-200">
              Learn More
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
