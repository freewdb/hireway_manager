
import { useState, useCallback, useEffect } from 'react';
import { useCombobox } from 'downshift';
import { debounce } from 'lodash';
import type { JobTitleSearchResult } from '../../types/schema';

interface SOCSearchProps {
  onSelect: (result: JobTitleSearchResult) => void;
  placeholder?: string;
  className?: string;
  sector?: string;
}

export function SOCSearch({ onSelect, placeholder = 'Search for a job title...', className = '', sector }: SOCSearchProps) {
  const [inputItems, setInputItems] = useState<JobTitleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JobTitleSearchResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<JobTitleSearchResult[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [topOccupations, setTopOccupations] = useState<JobTitleSearchResult[]>([]);

  useEffect(() => {
    if (sector) {
      fetch(`/api/soc/top?sector=${encodeURIComponent(sector)}`)
        .then(res => res.json())
        .then(data => setTopOccupations(data))
        .catch(err => console.error('Failed to fetch top occupations:', err));
    }
  }, [sector]);

  const searchSOC = async (query: string) => {
    if (!query.trim()) {
      setInputItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const url = `/api/soc/search?search=${encodeURIComponent(query)}${sector ? `&sector=${encodeURIComponent(sector)}` : ''}${showAll ? '&showAll=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch results');
      const results: JobTitleSearchResult[] = await response.json();

      const uniqueResults = Array.from(
        results.reduce((map, item) => {
          if (!map.has(item.code) || (item.rank || 0) > (map.get(item.code)?.rank || 0)) {
            map.set(item.code, item);
          }
          return map;
        }, new Map<string, JobTitleSearchResult>())
      ).map(([_, item]) => item);

      setInputItems(uniqueResults);
    } catch (err) {
      setError('Failed to fetch results. Please try again.');
      setInputItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(searchSOC, 300), []);

  const handleSelect = (item: JobTitleSearchResult) => {
    const uniqueId = `${item.code}-${item.title}`;
    if (!selectedItems.some(selected => `${selected.code}-${selected.title}` === uniqueId)) {
      onSelect(item);
      setSelectedItem(item);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      setSelectedItems(prev => [...prev, selectedItem]);
    }
  }, [selectedItem]);

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items: inputItems,
    onInputValueChange: ({ inputValue }) => {
      debouncedSearch(inputValue || '');
    },
    itemToString: (item) => item?.title || '',
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        handleSelect(selectedItem);
      }
    },
  });

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative w-full">
          <input
            {...getInputProps()}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={placeholder}
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="w-5 h-5 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          )}
        </div>
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            {showAll ? 'Show Fewer' : 'Show All'}
          </button>
        </div>

        <ul
          {...getMenuProps()}
          className={`w-full mt-4 space-y-2 max-h-[60vh] overflow-y-auto ${
            !isOpen || inputItems.length === 0 ? 'hidden' : ''
          }`}
        >
          {error ? (
            <li className="px-4 py-2 text-red-500">{error}</li>
          ) : (
            inputItems.map((item, index) => (
              <li
                key={`${item.code}-${index}`}
                {...getItemProps({
                  item,
                  index,
                })}
                className={`p-4 cursor-pointer bg-white border border-gray-200 rounded-lg shadow-sm ${
                  highlightedIndex === index
                    ? 'ring-2 ring-blue-500 border-transparent'
                    : 'hover:border-blue-300 hover:shadow'
                }`}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-sm text-blue-600">{item.code}</span>
                  <span className="font-medium">{item.title}</span>
                  {item.matchType === 'alternative' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Common Alternate Title: {item.matchedAlternative}
                    </span>
                  )}
                  {sector && (
                    <div 
                      className={`ml-auto inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                        !item.sectorDistribution ? 'bg-gray-100 text-gray-800' :
                        item.sectorDistribution >= 90 ? 'bg-indigo-100 text-indigo-800' :
                        item.sectorDistribution >= 75 ? 'bg-purple-100 text-purple-800' :
                        item.sectorDistribution >= 30 ? 'bg-green-100 text-green-800' :
                        item.sectorDistribution >= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {!item.sectorDistribution ? 'Not Present' :
                       item.sectorDistribution >= 90 ? 'Primary Industry Role' :
                       item.sectorDistribution >= 75 ? 'Industry Specialist' :
                       item.sectorDistribution >= 30 ? 'Common in Industry' :
                       item.sectorDistribution >= 10 ? 'Present in Industry' :
                       'Rare in Industry'}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600 line-clamp-2">
                  {item.description || "Description not available"}
                </div>
                {item.alternativeTitles?.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Also known as: {item.alternativeTitles.join(', ')}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
