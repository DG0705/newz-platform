import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../lib/supabase';
import Parser from 'rss-parser';

// 🚀 CRITICAL: Increases the Vercel serverless timeout limit to 60 seconds
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const parser = new Parser();

export async function GET(request: Request) {
  // 🔒 SECURITY CHECK
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    let combinedRawArticles: any[] = [];

    // ==========================================
    // SOURCE 1: GNews API (Max 10 Articles)
    // ==========================================
    try {
      const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=10&apikey=${process.env.GNEWS_API_KEY}`;
      const newsResponse = await fetch(gnewsUrl);
      const newsData = await newsResponse.json();
      
      if (newsData.articles) {
        combinedRawArticles = [...combinedRawArticles, ...newsData.articles];
      }
    } catch (e) {
      console.error("GNews fetch failed:", e);
    }

    // ==========================================
    // SOURCE 2: Free RSS Feed (BBC News - Max 20 Articles)
    // ==========================================
    try {
      const feed = await parser.parseURL('http://feeds.bbci.co.uk/news/rss.xml');
      
      const rssArticles = feed.items.slice(0, 20).map(item => ({
        title: item.title || "",
        description: item.contentSnippet || "", 
        content: item.content || "", 
        url: item.link || ""
      }));

      combinedRawArticles = [...combinedRawArticles, ...rssArticles];
    } catch (e) {
      console.error("RSS fetch failed:", e);
    }

    if (combinedRawArticles.length === 0) {
      return NextResponse.json({ error: 'No articles found from any source' }, { status: 400 });
    }

    // ==========================================
    // AI PROCESSING (SINGLE BATCH METHOD)
    // ==========================================
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    
    // 1. Prepare a single prompt containing ALL articles mapped by an ID
    const prompt = `
      You are a highly professional news editor. I am providing you with a JSON array of raw news articles.
      
      Tasks for EVERY article:
      1. Write a strict 2-3 bullet point summary of the most important facts. Keep it unbiased and extremely concise.
      2. Assess if it is real news (true) or fake/sensationalized (false).
      3. Categorize it into EXACTLY ONE of: Business, Technology, Sports, Politics, Entertainment, Health, World, or General.

      Here is the raw data:
      ${JSON.stringify(combinedRawArticles.map((a, i) => ({ id: i, title: a.title, description: a.description, content: a.content })))}

      Respond ONLY with a valid JSON array of objects in this exact format matching the IDs, with no markdown formatting or extra text:
      [
        {"id": 0, "summary": "bullets...", "is_real": true, "category": "Technology"},
        {"id": 1, "summary": "bullets...", "is_real": true, "category": "Sports"}
      ]
    `;

    // 2. Make ONE single request to Gemini
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean up markdown code blocks if Gemini adds them
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiDataArray = JSON.parse(responseText);

    // 3. Match the AI responses back to the original URLs
    const dbInserts = aiDataArray.map((aiData: any) => {
      const originalArticle = combinedRawArticles[aiData.id];
      return {
        title: originalArticle.title,
        summary: aiData.summary,
        source_url: originalArticle.url,
        is_real: aiData.is_real,
        category: aiData.category 
      };
    });

    // 4. Save ALL articles to Supabase in one single bulk operation
    const { error } = await supabase.from('articles').insert(dbInserts);

    if (error) {
      console.error("Database Bulk Save Error:", error);
      return NextResponse.json({ error: 'Failed to save to database.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Success! Fetched, processed, and saved ${dbInserts.length} articles.`, 
    });

  } catch (error) {
    console.error("Automation Error:", error);
    return NextResponse.json({ error: 'Something broke in the news room.' }, { status: 500 });
  }
}