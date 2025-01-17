import { useWizard } from "../wizard/WizardContext";
import { SOCSearch } from "../SOCSearch";
import { Switch } from "../ui/switch";
import WizardStep from "../wizard/WizardStep";
import { RoleInfoCard } from "../RoleInfoCard";
import type { JobTitleSearchResult } from "@/types/schema";
import { useState } from "react";

export const RoleStep = () => {
  const { updateData, nextStep, data } = useWizard();
  const [lastDistribution, setLastDistribution] = useState<number | null>(null);
  const [showTopRoles, setShowTopRoles] = useState(false);
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
              </>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Show Top Roles</span>
            <Switch
              checked={showTopRoles}
              onCheckedChange={setShowTopRoles}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          <SOCSearch 
            onSelect={handleSelect}
            sector={data.industry}
            hideTopOccupations={!showTopRoles}
          />

          <RoleInfoCard />
        </div>
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
      </div>
    </WizardStep>
  );
};

export default RoleStep;