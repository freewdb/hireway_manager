
import { useState } from 'react';
import { SOCSearch } from './index';
import type { JobTitleSearchResult } from '../../../db/schema';
import { industries } from '../steps/IndustryStep';

export function SOCSearchTest() {
  const [selectedJob, setSelectedJob] = useState<JobTitleSearchResult | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  const handleSelect = (result: JobTitleSearchResult) => {
    setSelectedJob(result);
    console.log('Selected job:', result);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SOC Code Search Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Industry
        </label>
        <select 
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="">No Industry Filter</option>
          {industries.map((industry) => (
            <option key={industry.code} value={industry.code}>
              {industry.code} - {industry.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-8">
        <SOCSearch
          onSelect={handleSelect}
          placeholder="Try searching for 'Software Engineer' or 'Developer'..."
          sector={selectedIndustry}
          className="w-full"
        />
      </div>

      {selectedJob && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Selected Job Details:</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Title:</dt>
              <dd>{selectedJob.title}</dd>
            </div>
            <div>
              <dt className="font-medium">SOC Code:</dt>
              <dd>{selectedJob.code}</dd>
            </div>
            <div>
              <dt className="font-medium">Major Group:</dt>
              <dd>{selectedJob.majorGroup?.title}</dd>
            </div>
            <div>
              <dt className="font-medium">Minor Group:</dt>
              <dd>{selectedJob.minorGroup?.title}</dd>
            </div>
            {selectedJob.description && (
              <div>
                <dt className="font-medium">Description:</dt>
                <dd className="text-sm">{selectedJob.description}</dd>
              </div>
            )}
            {selectedJob.sectorDistribution !== undefined && (
              <div>
                <dt className="font-medium">Sector Distribution:</dt>
                <dd>{Math.round(selectedJob.sectorDistribution)}%</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
