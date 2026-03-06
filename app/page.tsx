"use client"; 

import { supabase } from '../lib/supabase';
import Link from 'next/link';
import SearchBar from './SearchBar';
import { useTheme } from "next-themes";
import { useEffect, useState, use } from 'react'; // <-- Added 'use' here

const CATEGORIES = ['All', 'Business', 'Technology', 'Sports', 'Politics', 'Entertainment', 'Health', 'World', 'General'];

// Updated the type to expect a Promise for Next.js 15
export default function Home({ searchParams }: { searchParams: Promise<{ category?: string, search?: string }> }) {
  const { theme, setTheme } = useTheme();
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UNWRAP THE PROMISE (The Next.js 15 fix!)
  const resolvedParams = use(searchParams);
  const currentCategory = resolvedParams.category || 'All';
  const currentSearch = resolvedParams.search || '';

  useEffect(() => {
    async function fetchNews() {
      setIsLoading(true);
      let query = supabase.from('articles').select('*').order('created_at', { ascending: false });

      if (currentCategory !== 'All') {
        query = query.eq('category', currentCategory);
      }
      if (currentSearch) {
        query = query.ilike('title', `%${currentSearch}%`);
      }

      const { data } = await query;
      if (data) setArticles(data);
      setIsLoading(false);
    }
    fetchNews();
  }, [currentCategory, currentSearch]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-6 pt-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-black dark:text-white">Newz.</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Simple. Professional. Informative.</p>
          </div>
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </header>

        {/* Note: In production you can also add dark mode classes inside SearchBar.tsx! */}
        <SearchBar />

        <nav className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const href = cat === 'All' 
              ? (currentSearch ? `/?search=${currentSearch}` : '/') 
              : `/?category=${cat}${currentSearch ? `&search=${currentSearch}` : ''}`;

            return (
              <Link 
                key={cat} 
                href={href}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm ${
                  currentCategory === cat 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-black dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                {cat}
              </Link>
            )
          })}
        </nav>

        {isLoading ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading your news...</div>
        ) : (
          <div className="space-y-8">
            {articles.map((article) => (
              <article key={article.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition duration-200 hover:shadow-md dark:hover:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    {article.category && (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider w-fit">
                        {article.category}
                      </span>
                    )}
                    <h2 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">{article.title}</h2>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap w-fit mt-1 md:mt-0 ${
                    article.is_real 
                      ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                      : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                  }`}>
                    {article.is_real ? '✓ Verified' : '⚠ Disputed'}
                  </span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-base md:text-lg mb-6 leading-relaxed whitespace-pre-line">
                  {article.summary}
                </div>
                <div className="flex items-center justify-between text-sm mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <span className="text-gray-400 dark:text-gray-500 font-medium">
                    {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-1">
                    Original Source ↗
                  </a>
                </div>
              </article>
            ))}
            
            {articles.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-lg">No articles found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}