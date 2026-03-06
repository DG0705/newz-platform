import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET(request: Request) {
  // 🔒 SECURITY CHECK
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    // 1. Fetch Top Headlines
    const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=3&apikey=${process.env.GNEWS_API_KEY}`;
    const newsResponse = await fetch(gnewsUrl);
    const newsData = await newsResponse.json();

    if (!newsData.articles) {
      return NextResponse.json({ error: 'No articles found' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const processedArticles = [];

    // 2. Loop through each article and let AI process it
    for (const article of newsData.articles) {
      const prompt = `
        You are a highly professional news editor. Analyze this raw news data:
        Title: ${article.title}
        Description: ${article.description}
        Content: ${article.content}

        Tasks:
        1. Write a strict 2-3 bullet point summary of the most important facts. Keep it unbiased and extremely concise.
        2. Assess if this appears to be a legitimate, factual news story (true) or highly sensationalized/fake (false).
        3. Categorize this article into exactly ONE of these categories: Business, Technology, Sports, Politics, Entertainment, Health, World, or General.

        Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or extra text:
        {"summary": "your bullet points here", "is_real": true, "category": "Technology"}
      `;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(responseText);

      // 3. Save to Supabase (Now includes category!)
      const { error } = await supabase
        .from('articles')
        .insert([
          {
            title: article.title,
            summary: aiData.summary,
            source_url: article.url,
            is_real: aiData.is_real,
            category: aiData.category // <-- NEW DATA POINT
          }
        ]);

      if (error) {
        console.error("Database Save Error:", error);
      } else {
        processedArticles.push(article.title);
      }
    }

    return NextResponse.json({ 
      message: "Success! Processed new articles with categories.", 
      articles_added: processedArticles 
    });

  } catch (error) {
    console.error("Automation Error:", error);
    return NextResponse.json({ error: 'Something broke in the news room.' }, { status: 500 });
  }
}