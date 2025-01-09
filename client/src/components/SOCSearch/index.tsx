import { useState, useCallback, useEffect } from 'react';
import { useCombobox } from 'downshift';
import { debounce } from 'lodash';
import type { JobTitleSearchResult } from '../../types/schema';

interface SOCSearchProps {
  onSelect: (result: JobTitleSearchResult) => void;
  placeholder?: string;
  className?: string;
  sector?: string; // Added sector prop
}

export function SOCSearch({ onSelect, placeholder = 'Search for a job title...', className = '', sector }: SOCSearchProps) {
  const [inputItems, setInputItems] = useState<JobTitleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JobTitleSearchResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<JobTitleSearchResult[]>([]);
  const [showAll, setShowAll] = useState(false); // Added showAll state

  const searchSOC = async (query: string) => {
    if (!query.trim()) {
      setInputItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const url = `/api/job-titles?search=${encodeURIComponent(query)}${sector ? `&sector=${encodeURIComponent(sector)}` : ''}${showAll ? '&showAll=true' : ''}`; // Updated URL
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch results');
      const results: JobTitleSearchResult[] = await response.json();

      // Deduplicate by code, keeping highest ranked result
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

  // Debounce the search to avoid too many API calls
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
    <div className={`relative w-full ${className}`}>
      <div className="flex items-center"> {/* Added flex to align input and button */}
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
        <button
          onClick={() => setShowAll(!showAll)}
          className="ml-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          {showAll ? 'Show Fewer' : 'Show All'}
        </button> {/* Added Show All toggle button */}
      </div>

      <ul
        {...getMenuProps()}
        className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-auto ${
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
              className={`px-4 py-3 cursor-pointer ${
                highlightedIndex === index
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-mono text-sm text-blue-600">{item.code}</span>
                <span className="font-medium">{item.title}</span>
                {sector && (
                  <div 
                    className={`ml-auto inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                      item.sectorDistribution >= 90 ? 'bg-blue-100 text-blue-800' :
                      item.sectorDistribution >= 50 ? 'bg-green-100 text-green-800' :
                      item.sectorDistribution >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      item.sectorDistribution === 0 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                    title={`${Math.round(item.sectorDistribution || 0)}% of these roles are in your selected industry`}
                  >
                    {item.sectorDistribution >= 90 ? 'Specialist' :
                     item.sectorDistribution >= 50 ? 'High Match' :
                     item.sectorDistribution >= 10 ? 'Moderate Match' :
                     item.sectorDistribution === 0 ? 'No Presence' :
                     'Low Match'}
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
  );
}