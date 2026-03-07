"use client"; 

import { supabase } from '../lib/supabase';
import Link from 'next/link';
import SearchBar from './SearchBar';
import { useTheme } from "next-themes";
import { useEffect, useState, use } from 'react';

const CATEGORIES = ['All', 'Business', 'Technology', 'Sports', 'Politics', 'Entertainment', 'Health', 'World', 'General'];
const ARTICLES_PER_PAGE = 6; 

export default function Home({ searchParams }: { searchParams: Promise<{ category?: string, search?: string }> }) {
  const { theme, setTheme } = useTheme();
  
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [session, setSession] = useState<any>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // --- NEW: Toast Notification State ---
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const resolvedParams = use(searchParams);
  const currentCategory = resolvedParams.category || 'All';
  const currentSearch = resolvedParams.search || '';

  // Helper function to show a message for 3 seconds
  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000); // Disappears after 3 seconds
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchBookmarks() {
      if (!session) {
        setBookmarkedIds([]);
        return;
      }
      const { data } = await supabase.from('bookmarks').select('article_id').eq('user_id', session.user.id);
      if (data) setBookmarkedIds(data.map(b => b.article_id));
    }
    fetchBookmarks();
  }, [session]);

  useEffect(() => {
    setArticles([]);
    setPage(0);
    setHasMore(true);
    fetchNews(0, true);
  }, [currentCategory, currentSearch]);

  async function fetchNews(pageNumber: number, isInitialLoad: boolean = false) {
    if (isInitialLoad) setIsLoading(true);
    else setIsLoadingMore(true);

    let query = supabase.from('articles').select('*').order('created_at', { ascending: false });

    if (currentCategory !== 'All') query = query.eq('category', currentCategory);
    if (currentSearch) query = query.ilike('title', `%${currentSearch}%`);

    const from = pageNumber * ARTICLES_PER_PAGE;
    const to = from + ARTICLES_PER_PAGE - 1;
    query = query.range(from, to);

    const { data } = await query;
    
    if (data) {
      if (isInitialLoad) setArticles(data);
      else setArticles((prev) => [...prev, ...data]);
      if (data.length < ARTICLES_PER_PAGE) setHasMore(false);
    }
    
    setIsLoading(false);
    setIsLoadingMore(false);
  }

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, false);
  };

  // --- UPDATED: Replaced alerts with showToast() ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) {
        showToast(error.message, 'error');
      } else { 
        showToast('Account created! You are now logged in.', 'success'); 
        setAuthEmail(''); 
        setAuthPassword(''); 
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) {
        showToast("Login failed. Check your email and password.", 'error');
      } else { 
        showToast("Successfully logged in!", "success");
        setAuthEmail(''); 
        setAuthPassword(''); 
      }
    }
  };

  // --- UPDATED: Replaced alert with showToast() ---
  const toggleBookmark = async (articleId: number) => {
    if (!session) {
      showToast("Please log in to save articles!", "error");
      return;
    }

    const isBookmarked = bookmarkedIds.includes(articleId);
    
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('article_id', articleId);
      setBookmarkedIds(prev => prev.filter(id => id !== articleId));
      showToast("Article removed from saved.", "success");
    } else {
      await supabase.from('bookmarks').insert([{ user_id: session.user.id, article_id: articleId }]);
      setBookmarkedIds(prev => [...prev, articleId]);
      showToast("Article saved successfully!", "success");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 transition-colors duration-300 relative">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-6 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-black dark:text-white">Newz.</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Simple. Professional. Informative.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            {session ? (
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800/50 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  👤 {session.user.email?.split('@')[0]}
                </span>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                <button 
                  onClick={() => {
                    supabase.auth.signOut();
                    showToast("Logged out successfully.", "success");
                  }} 
                  className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full sm:w-auto">
                <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-[110px] sm:w-[130px] px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required className="w-[110px] sm:w-[130px] px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button type="submit" className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  {isSignUp ? 'Sign Up' : 'Log In'}
                </button>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-gray-500 hover:text-black dark:hover:text-white underline w-full sm:w-auto text-center mt-1 sm:mt-0 sm:ml-1">
                  {isSignUp ? 'Login instead' : 'Create account'}
                </button>
              </form>
            )}

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors self-end sm:self-auto"
              aria-label="Toggle Dark Mode"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        <SearchBar />

        <nav className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const href = cat === 'All' 
              ? (currentSearch ? `/?search=${currentSearch}` : '/') 
              : `/?category=${cat}${currentSearch ? `&search=${currentSearch}` : ''}`;

            return (
              <Link key={cat} href={href} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm ${currentCategory === cat ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-black dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white'}`}>
                {cat}
              </Link>
            )
          })}
        </nav>

        {isLoading ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading your news...</div>
        ) : (
          <div className="space-y-8">
            {articles.map((article) => {
              const isSaved = bookmarkedIds.includes(article.id);
              
              return (
                <article key={article.id} className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition duration-200 hover:shadow-md dark:hover:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="flex flex-col gap-2 flex-1">
                      {article.category && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider w-fit">
                          {article.category}
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">{article.title}</h2>
                        <button 
                          onClick={() => toggleBookmark(article.id)}
                          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                            isSaved 
                              ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {isSaved ? '★ Saved' : '☆ Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
              );
            })}
            
            {articles.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-lg">No articles found.</p>
              </div>
            )}

            {articles.length > 0 && hasMore && (
              <div className="flex justify-center pt-8 pb-12">
                <button 
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More News ↓'}
                </button>
              </div>
            )}
            
            {articles.length > 0 && !hasMore && (
               <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                 You've reached the end of the feed.
               </div>
            )}

          </div>
        )}
      </div>

      {/* --- NEW: Floating Toast Notification UI --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl font-semibold text-white transition-opacity duration-300 z-50 flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
    </main>
  );
}