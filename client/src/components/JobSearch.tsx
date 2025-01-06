
import { useState } from 'react';
import { Input } from './ui/input';

export function JobSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (term: string) => {
    if (term.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/job-titles?search=${encodeURIComponent(term)}`);
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Input 
        type="search"
        placeholder="Search jobs..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {results.map((job: any) => (
            <li key={job.code}>
              {job.title} - {job.code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
