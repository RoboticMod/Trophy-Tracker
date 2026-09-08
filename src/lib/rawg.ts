import { RawgGameResult, Platform } from '../types';

export const FALLBACK_POPULAR_GAMES: RawgGameResult[] = [
  {
    id: 494384,
    name: 'Elden Ring',
    background_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    released: '2022-02-25',
    rating: 4.8,
    genres: [{ id: 4, name: 'Action' }, { id: 5, name: 'RPG' }],
    platforms: [{ platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }, { platform: { id: 4, name: 'PC', slug: 'pc' } }]
  },
  {
    id: 58175,
    name: 'God of War Ragnarök',
    background_image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    released: '2022-11-09',
    rating: 4.9,
    genres: [{ id: 4, name: 'Action' }, { id: 3, name: 'Adventure' }],
    platforms: [{ platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 3328,
    name: 'The Witcher 3: Wild Hunt',
    background_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    released: '2015-05-18',
    rating: 4.9,
    genres: [{ id: 5, name: 'RPG' }, { id: 3, name: 'Adventure' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 906547,
    name: 'Balatro',
    background_image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    released: '2024-02-20',
    rating: 4.8,
    genres: [{ id: 28, name: 'Roguelike' }, { id: 10, name: 'Strategy' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }],
  },
  {
    id: 452634,
    name: 'Cyberpunk 2077: Phantom Liberty',
    background_image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    released: '2023-09-26',
    rating: 4.7,
    genres: [{ id: 5, name: 'RPG' }, { id: 4, name: 'Action' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 58134,
    name: 'Marvel\'s Spider-Man 2',
    background_image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    released: '2023-10-20',
    rating: 4.7,
    genres: [{ id: 4, name: 'Action' }, { id: 3, name: 'Adventure' }],
    platforms: [{ platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 9767,
    name: 'Hollow Knight: Silksong',
    background_image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    released: '2025-11-12',
    rating: 4.9,
    genres: [{ id: 83, name: 'Platformer' }, { id: 51, name: 'Indie' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }],
  },
  {
    id: 2462,
    name: 'Genshin Impact',
    background_image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    released: '2020-09-28',
    rating: 4.4,
    genres: [{ id: 5, name: 'RPG' }, { id: 4, name: 'Action' }],
    platforms: [{ platform: { id: 21, name: 'Android', slug: 'android' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 799275,
    name: 'Black Myth: Wukong',
    background_image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    released: '2024-08-20',
    rating: 4.7,
    genres: [{ id: 4, name: 'Action' }, { id: 5, name: 'RPG' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 864,
    name: 'Red Dead Redemption 2',
    background_image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=600&auto=format&fit=crop&q=80',
    released: '2018-10-26',
    rating: 4.9,
    genres: [{ id: 4, name: 'Action' }, { id: 3, name: 'Adventure' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 3498,
    name: 'Grand Theft Auto V',
    background_image: 'https://images.unsplash.com/photo-1552824796-03c00445d045?w=600&auto=format&fit=crop&q=80',
    released: '2013-09-17',
    rating: 4.8,
    genres: [{ id: 4, name: 'Action' }, { id: 3, name: 'Adventure' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }, { platform: { id: 187, name: 'PlayStation 5', slug: 'playstation5' } }]
  },
  {
    id: 9768,
    name: 'Hades II',
    background_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    released: '2024-05-06',
    rating: 4.9,
    genres: [{ id: 4, name: 'Action' }, { id: 51, name: 'Indie' }],
    platforms: [{ platform: { id: 4, name: 'PC', slug: 'pc' } }],
  },
];

const CACHE_PREFIX = 'gametracker_rawg_cache_v1_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  timestamp: number;
  results: RawgGameResult[];
}

function getFromCache(key: string): RawgGameResult[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.results;
  } catch (e) {
    return null;
  }
}

function setInCache(key: string, results: RawgGameResult[]) {
  try {
    const entry: CacheEntry = {
      timestamp: Date.now(),
      results,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // quota exceeded or private browsing
  }
}

export function getRawgCacheCount(): number {
  try {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        count++;
      }
    }
    return count;
  } catch (e) {
    return 0;
  }
}

export function clearRawgCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

export async function searchGames(query: string, apiKey?: string): Promise<RawgGameResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return FALLBACK_POPULAR_GAMES;
  }

  // Check local cache first
  const cached = getFromCache(trimmed);
  if (cached && cached.length > 0) {
    return cached;
  }

  // If RAWG API key is configured, fetch live results from RAWG
  const activeKey = apiKey || import.meta.env.VITE_RAWG_API_KEY;
  if (activeKey && activeKey !== 'YOUR_RAWG_API_KEY') {
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${activeKey}&search=${encodeURIComponent(trimmed)}&page_size=16`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setInCache(trimmed, data.results);
          return data.results;
        }
      }
    } catch (err) {
      console.warn('RAWG API live search failed, falling back to local database:', err);
    }
  }

  // Fallback to local catalog filtering
  const filteredFallback = FALLBACK_POPULAR_GAMES.filter((g) =>
    g.name.toLowerCase().includes(trimmed) ||
    g.genres?.some(genre => genre.name.toLowerCase().includes(trimmed))
  );

  if (filteredFallback.length > 0) {
    setInCache(trimmed, filteredFallback);
  }

  return filteredFallback;
}

export function detectPlatformFromRawg(result: RawgGameResult): Platform {
  const slugs = (result.platforms || []).map((p) => p.platform.slug.toLowerCase());
  if (slugs.some((s) => s.includes('playstation') || s.startsWith('ps'))) {
    return 'ps5';
  }
  return 'steam';
}
