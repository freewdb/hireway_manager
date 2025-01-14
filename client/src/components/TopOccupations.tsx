
import { useState, useEffect } from 'react';
import type { JobTitleSearchResult } from '../types/schema';

interface TopOccupationsProps {
  sector?: string;
  onSelect: (occupation: JobTitleSearchResult) => void;
}

export function TopOccupations({ sector, onSelect }: TopOccupationsProps) {
  const [topOccupations, setTopOccupations] = useState<JobTitleSearchResult[]>([]);

  useEffect(() => {
    if (sector) {
      fetch(`/api/soc/top?sector=${encodeURIComponent(sector)}`)
        .then(res => res.json())
        .then(data => setTopOccupations(data))
        .catch(err => console.error('Failed to fetch top occupations:', err));
    }
  }, [sector]);

  if (!topOccupations.length) return null;

  return (
    <div className="w-80 shrink-0">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Popular roles in this industry:</h3>
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        {topOccupations.map((occ) => {
          const isExclusive = occ.sectorDistribution >= 90;
          const isRare = occ.sectorDistribution < 5;

          return (
            <button
              key={occ.code}
              onClick={() => onSelect(occ)}
              className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="font-medium text-gray-900">{occ.title}</div>
                <span className="text-xs font-mono text-gray-500">{occ.code}</span>
              </div>

              {isExclusive && (
                <span className="inline-flex items-center px-2 py-0.5 mt-2 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                  Primary Industry
                </span>
              )}
              {isRare && (
                <span className="inline-flex items-center px-2 py-0.5 mt-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full">
                  Rare in this industry
                </span>
              )}

              <div className="mt-1 text-sm text-gray-500 line-clamp-2">
                {occ.description}
              </div>

              <div className="mt-2 text-xs text-gray-400">
                {Math.round(occ.sectorDistribution)}% in this industry
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
