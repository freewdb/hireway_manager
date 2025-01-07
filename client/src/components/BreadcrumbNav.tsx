
import { useWizard } from "./wizard/WizardContext";

const stepLabels = {
  industry: {
    name: "Industry",
    getLabel: (value: string, data: any) => {
      const industries = {
        "11": "Agriculture",
        "71": "Arts & Entertainment",
        "23": "Construction",
        "52": "Finance",
        "62": "Healthcare",
        "51": "Information",
        "31": "Manufacturing",
        "21": "Mining & Oil",
        "54": "Professional Services",
        "44": "Retail",
        "22": "Utilities",
        "42": "Wholesale"
      };
      return industries[data.industry] || "Industry";
    },
  },
  companySize: {
    name: "Company Size",
    getLabel: (value: string, data: any) => value || "Company Size",
  },
  companyStage: {
    name: "Stage",
    getLabel: (value: string, data: any) => value || "Stage",
  },
  location: {
    name: "Location",
    getLabel: (value: string, data: any) => value || "Location",
  },
  role: {
    name: "Role",
    getLabel: (value: string, data: any) => data.roleTitle || "Role",
  },
  scenario: {
    name: "Context",
    getLabel: (value: string) => ({
      new: "New Role",
      replacement: "Replacement",
      expansion: "Team Expansion",
    }[value] || "Context"),
  },
};

export const BreadcrumbNav = () => {
  const { currentStep, setCurrentStep, data } = useWizard();
  const steps = ["industry", "companySize", "companyStage", "location", "role", "scenario"] as const;
  
  const getStepColor = (index: number) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
    return data[steps[index]] ? colors[index % colors.length] : "bg-gray-200";
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {steps.map((step, index) => (
        <button
          key={step}
          onClick={() => setCurrentStep(index)}
          className={`px-3 py-1 rounded-full text-sm transition-all ${
            index === currentStep
              ? `${getStepColor(index)} text-white`
              : data[step]
              ? `${getStepColor(index)} text-white hover:opacity-90`
              : "bg-gray-50 text-gray-400"
          }`}
        >
          {stepLabels[step].getLabel(data[step], data)}
        </button>
      ))}
    </div>
  );
};
