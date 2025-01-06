import { useState } from 'react';
import { SOCSearch } from './index';
import type { JobTitleSearchResult } from '../../../db/schema';

export function SOCSearchTest() {
  const [selectedJob, setSelectedJob] = useState<JobTitleSearchResult | null>(null);

  const handleSelect = (result: JobTitleSearchResult) => {
    setSelectedJob(result);
    console.log('Selected job:', result);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SOC Code Search Test</h1>
      
      <div className="mb-8">
        <SOCSearch
          onSelect={handleSelect}
          placeholder="Try searching for 'Software Engineer' or 'Developer'..."
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
            {selectedJob.isAlternative && (
              <div className="mt-2 text-sm text-blue-600">
                This is an alternative title
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
} 