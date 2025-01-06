import { useState, useCallback } from 'react';
import { useCombobox } from 'downshift';
import { debounce } from 'lodash';
import type { JobTitleSearchResult } from '../../types/schema';

interface SOCSearchProps {
  onSelect: (result: JobTitleSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function SOCSearch({ onSelect, placeholder = 'Search for a job title...', className = '' }: SOCSearchProps) {
  const [inputItems, setInputItems] = useState<JobTitleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchSOC = async (query: string) => {
    if (!query.trim()) {
      setInputItems([]);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/job-titles?search=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const results: JobTitleSearchResult[] = await response.json();
      setInputItems(results);
    } catch (err) {
      setError('Failed to fetch results. Please try again.');
      setInputItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the search to avoid too many API calls
  const debouncedSearch = useCallback(debounce(searchSOC, 300), []);

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
        onSelect(selectedItem);
      }
    },
  });

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
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
              className={`px-4 py-2 cursor-pointer ${
                highlightedIndex === index
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{item.title}</div>
              {item.isAlternative && (
                <div className="text-sm text-gray-500">Alternative title for: {item.title}</div>
              )}
              <div className="text-xs text-gray-400">
                {item.majorGroup?.title} › {item.minorGroup?.title}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
} 