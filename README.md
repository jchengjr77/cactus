# Cactus

A modern web application built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** with custom design system
- **Supabase** integration for backend services
- **Inter** font for body text
- **JetBrains Mono** for monospace/data display

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (create one at [supabase.com](https://supabase.com))

### Environment Variables

Create a `.env.local` file in the root directory and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utility functions and configurations
│   └── supabase/        # Supabase client configurations
├── supabase/
│   └── migrations/      # Database migration files
└── public/              # Static assets
```

## Design System

The application uses a minimal design system with:

- **Colors**: White background (#FFFFFF), black text (#000000), light gray surface (#F8F8F8)
- **Fonts**: Inter for body text, JetBrains Mono for monospace
- **Shadows**: Minimal shadow system for subtle depth

## Supabase Integration

The project includes pre-configured Supabase clients:

- `lib/supabase/client.ts` - For client-side components
- `lib/supabase/server.ts` - For server-side components and API routes

## Development

Edit `app/page.tsx` to modify the landing page. The page auto-updates as you edit the file.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
