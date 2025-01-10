import { useWizard } from "../wizard/WizardContext";
import { SOCSearch } from "../SOCSearch";
import WizardStep from "../wizard/WizardStep";
import { RoleInfoCard } from "../RoleInfoCard";
import type { JobTitleSearchResult } from "@/types/schema";
import { useState } from "react";

export const RoleStep = () => {
  const { updateData, nextStep, data } = useWizard();
  const [lastDistribution, setLastDistribution] = useState<number | null>(null);

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
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
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
        </div>
        <SOCSearch 
          onSelect={handleSelect} 
          placeholder="Search for a job title (e.g., Software Developer, IT Manager)"
          sector={data.industry}
        />
        <RoleInfoCard />
      </div>
    </WizardStep>
  );
};

export default RoleStep;