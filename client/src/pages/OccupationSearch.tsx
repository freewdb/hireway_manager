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
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Occupation Search</h1>
        <RoleStep />
      </div>
    </WizardProvider>
  );
}