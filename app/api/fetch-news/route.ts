import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../../lib/supabase';

// Initialize the Gemini AI with your secret key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET() {
  try {
    // 1. Fetch Top Headlines from GNews (fetching 3 at a time for testing)
    const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=3&apikey=${process.env.GNEWS_API_KEY}`;
    const newsResponse = await fetch(gnewsUrl);
    const newsData = await newsResponse.json();

    if (!newsData.articles) {
      return NextResponse.json({ error: 'No articles found from GNews' }, { status: 400 });
    }

    // Use the fast Gemini model
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

        Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or extra text:
        {"summary": "your bullet points here", "is_real": true}
      `;

      // Get the AI's response
      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      // Clean up the response just in case Gemini adds formatting
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(responseText);

      // 3. Save the clean, AI-processed news into your Supabase database
      const { error } = await supabase
        .from('articles')
        .insert([
          {
            title: article.title,
            summary: aiData.summary,
            source_url: article.url,
            is_real: aiData.is_real,
          }
        ]);

      if (error) {
        console.error("Database Save Error:", error);
      } else {
        processedArticles.push(article.title);
      }
    }

    // Let us know it worked!
    return NextResponse.json({ 
      message: "Success! The AI News Room just processed new articles.", 
      articles_added: processedArticles 
    });

  } catch (error) {
    console.error("Automation Error:", error);
    return NextResponse.json({ error: 'Something broke in the news room.' }, { status: 500 });
  }
}