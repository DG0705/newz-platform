"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Keep track of what the user is typing
  const [term, setTerm] = useState(searchParams.get('search') || '');

  // This runs every time a letter is typed
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerm(value);
    
    // Create a new URL with the search term
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    
    // Instantly update the URL without refreshing the page!
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="mb-6 w-full md:w-2/3 lg:w-1/2">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search articles by title..." 
          value={term}
          onChange={handleSearch}
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent shadow-sm transition-shadow"
        />
        {/* A simple magnifying glass icon */}
        <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}