import { supabase } from '../lib/supabase';

// Tell Next.js to not cache this page so we always see fresh news
export const revalidate = 0; 

export default async function Home() {
  // Fetch articles from Supabase, ordered by newest first
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error);
    return <div className="p-10 text-red-500">Failed to load news.</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 border-b border-gray-200 pb-6 pt-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-black">Newz.</h1>
          <p className="text-gray-500 text-lg">Simple. Professional. Informative.</p>
        </header>

        {/* News Feed Section */}
        <div className="space-y-8">
          {articles?.map((article) => (
            <article key={article.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 transition duration-200 hover:shadow-md">
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold leading-snug text-gray-900">{article.title}</h2>
                
                {/* The Real/Fake Badge */}
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap w-fit ${
                  article.is_real 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {article.is_real ? '✓ Verified' : '⚠ Disputed'}
                </span>
              </div>
              
              {/* AI Summary */}
              <div className="text-gray-700 text-base md:text-lg mb-6 leading-relaxed whitespace-pre-line">
                {article.summary}
              </div>

              {/* Footer: Date and Source */}
              <div className="flex items-center justify-between text-sm mt-4 pt-4 border-t border-gray-50">
                <span className="text-gray-400 font-medium">
                  {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <a 
                  href={article.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold hover:text-blue-800 transition flex items-center gap-1"
                >
                  Original Source ↗
                </a>
              </div>
            </article>
          ))}
          
          {articles?.length === 0 && (
            <div className="text-center text-gray-500 py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-lg">No news processed yet.</p>
              <p className="text-sm mt-2">Visit /api/fetch-news to trigger the AI engine.</p>
            </div>
          )}
        </div>
        
      </div>
    </main>
  );
}