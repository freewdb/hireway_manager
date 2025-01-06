
import { useWizard } from "../wizard/WizardContext";
import { SOCSearch } from "../SOCSearch";
import WizardStep from "../wizard/WizardStep";
import type { JobTitleSearchResult } from "@/types/schema";

export const RoleStep = () => {
  const { updateData } = useWizard();

  const handleSelect = (result: JobTitleSearchResult) => {
    updateData("role", result.code);
    updateData("roleTitle", result.title);
    updateData("roleDescription", result.description);
    updateData("alternativeTitles", result.alternativeTitles || []);
    
    if (result.code) {
      nextStep();
    }
  };

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="space-y-4">
        <SOCSearch 
          onSelect={handleSelect}
          placeholder="Search for a job title (e.g., Software Developer, IT Manager)"
        />
        <RoleInfoCard />
      </div>
    </WizardStep>
  );
};

export default RoleStep;
