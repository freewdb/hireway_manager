import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../components/ui/collapsible";

// ... other imports and code ...

function MyComponent() {
  // ... other code ...
  const handleSelect = (item) => {
    // ... handle selection logic ...
  };

  return (
    // ... other components ...
    <div className="w-80 fixed right-8 top-8">
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger className="w-full bg-white rounded-t-lg shadow-sm border border-gray-200 p-4 flex justify-between items-center hover:bg-gray-50">
            <div>
              <h3 className="font-medium text-gray-900">Top Roles in This Industry</h3>
              <p className="mt-1 text-sm text-gray-500">Popular occupations in your selected sector</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200">
            <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              <SOCSearch 
                onSelect={handleSelect}
                sector={data.industry}
                topOccupationsOnly
                className="top-occupations"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    // ... rest of the component ...
  );
}

export default MyComponent;

// ... rest of the file ...