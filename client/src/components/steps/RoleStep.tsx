
import { useWizard } from "../wizard/WizardContext";
import { SOCSearch } from "../SOCSearch";
import WizardStep from "../wizard/WizardStep";
import { RoleInfoCard } from "../RoleInfoCard";
import type { JobTitleSearchResult } from "@/types/schema";
import { useState } from "react";

export const RoleStep = () => {
  const { updateData, nextStep, data } = useWizard();
  const [lastDistribution, setLastDistribution] = useState<number | null>(null);
  const [showStickyMenu, setShowStickyMenu] = useState(true);
  const selectedOccupation = data.role ? {code: data.role, title: data.roleTitle} : null;

  const handleSelect = (result: JobTitleSearchResult) => {
    const distribution = result.sectorDistribution || result.topIndustries?.find(ind => 
      ind.sector === `NAICS${data.industry}`
    )?.percentage || 0;

    setLastDistribution(distribution);
    updateData("role", result.code);
    updateData("roleTitle", result.title);
    updateData("roleDescription", result.description);
    updateData("alternativeTitles", result.alternativeTitles || []);
    updateData("sectorDistribution", distribution);
  };

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="flex gap-6">
        <>
          <div className="flex-1 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm font-mono">
              <div><span className="font-medium">Selected NAICS:</span> {data.industry}</div>
              <div><span className="font-medium">Query Addition:</span> sector=NAICS{data.industry}</div>
              {lastDistribution !== null && (
                <div>
                  <span className="font-medium">Current Selection Distribution:</span>{' '}
                  {lastDistribution.toFixed(2)}% in selected industry
                </div>
              )}
              {data.sectorDistribution !== undefined && (
                <div>
                  <span className="font-medium">Overall Sector Distribution:</span>{' '}
                  {Math.round(data.sectorDistribution)}% in selected industry
                </div>
              )}
              {selectedOccupation && (
                <>
                  <div><span className="font-medium">Current Selection SOC:</span> {selectedOccupation.code} - {selectedOccupation.title}</div>
                  <div><span className="font-medium">Current Query:</span> SELECT percentage FROM soc_sector_distribution WHERE soc_code = '{selectedOccupation.code}' AND sector_label = 'NAICS{data.industry}';</div>
                  <div><span className="font-medium">Current Query Results:</span> {lastDistribution?.toFixed(2)}</div>
                  <div>
                    <span className="font-medium">Current Selection Applied Boost:</span> {lastDistribution >= 90 ? '2.0x (≥90%)' :
                      lastDistribution >= 75 ? '1.75x (≥75%)' :
                      lastDistribution >= 50 ? '1.5x (≥50%)' :
                      lastDistribution >= 25 ? '1.25x (≥25%)' :
                      lastDistribution >= 10 ? '1.1x (≥10%)' :
                      lastDistribution < 5 ? '0.75x (<5%)' : '1.0x'}
                  </div>
                </>
              )}
            </div>
            <SOCSearch 
              onSelect={handleSelect} 
              placeholder="Search for a job title (e.g., Software Developer, IT Manager)"
              sector={data.industry}
              hideTopOccupations
            />
            <RoleInfoCard />
          </div>
          {showStickyMenu && (
            <div className="w-80 sticky top-8 self-start ml-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Top Roles in This Industry</h3>
                  <p className="mt-1 text-sm text-gray-500">Popular occupations in your selected sector</p>
                </div>
                <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <SOCSearch 
                    onSelect={handleSelect}
                    sector={data.industry}
                    topOccupationsOnly
                    className="top-occupations"
                  />
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowStickyMenu(!showStickyMenu)}
            className="fixed right-8 top-24 z-50 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
            aria-label="Toggle top roles menu"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={showStickyMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>
        </>
      </div>
    </WizardStep>
  );
};

export default RoleStep;
