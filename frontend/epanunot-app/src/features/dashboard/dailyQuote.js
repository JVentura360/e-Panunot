import quotes from '../../data/dashboardQuotes.json' with { type: 'json' };

// Local calendar days keep the phrase stable across reloads, including offline.
export function dailyQuote(userId, date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const seed = Array.from(String(userId ?? '')).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  // A coprime stride spreads consecutive days across themes before repeating.
  const index = ((day * 37 + seed) % quotes.length + quotes.length) % quotes.length;
  return quotes[index];
}
