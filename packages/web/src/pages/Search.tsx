import { useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router';

interface SearchResult {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  channelName: string;
  senderName: string;
}

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.get<SearchResult[]>(`/v1/search?q=${encodeURIComponent(query)}`);
      setResults(data);
      setSearched(true);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-4">🔍 Search Messages</h1>

        <div className="flex gap-2 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search messages across all channels..."
            className="flex-1 rounded-lg bg-ocean border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-lobster focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-lobster px-5 py-2.5 text-sm font-semibold text-white hover:bg-lobster-light disabled:opacity-50 transition"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {searched && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2 opacity-30">🔍</div>
            <p className="text-white/40 text-sm">No results found for "{query}"</p>
          </div>
        )}

        <div className="space-y-2">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/channels/${r.channelId}`)}
              className="w-full text-left rounded-xl bg-ocean-light border border-white/5 p-4 hover:border-white/15 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-white/40">#{r.channelName}</span>
                <span className="text-[10px] text-white/20">·</span>
                <span className="text-xs text-white/50 font-medium">{r.senderName}</span>
                <span className="text-[10px] text-white/20 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white/80 line-clamp-2">{r.content}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
