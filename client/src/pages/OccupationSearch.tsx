import RoleStep from "@/components/steps/RoleStep";
import { WizardProvider } from "@/components/wizard/WizardContext";

const initialData = {
  companySize: "",
  companyStage: "",
  location: "",
  role: "",
  industry: "",
  scenario: ""
};

export default function OccupationSearch() {
  return (
    <WizardProvider initialData={initialData} onComplete={() => {}}>
      <div>
        <RoleStep />
      </div>
    </WizardProvider>
  );
}