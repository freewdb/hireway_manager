
import { useWizard } from "./wizard/WizardContext";

const stepLabels = {
  industry: {
    name: "Industry",
    getLabel: (value: string) => industries[value]?.name || "Industry",
  },
  companySize: {
    name: "Company",
    getLabel: (value: string) => {
      const labels = {
        small: "Small (1-50)",
        medium: "Medium (51-500)",
        large: "Large (500+)",
      };
      return labels[value as keyof typeof labels] || "Company";
    },
  },
  role: {
    name: "Role",
    getLabel: (value: string) => value || "Role",
  },
  scenario: {
    name: "Context",
    getLabel: (value: string) => {
      const labels = {
        new: "New Role",
        replacement: "Replacement",
        expansion: "Team Expansion",
      };
      return labels[value as keyof typeof labels] || "Context";
    },
  },
};

const industries = {
  "11": { name: "Agriculture" },
  "71": { name: "Arts & Recreation" },
  "23": { name: "Construction" },
  "52": { name: "Finance" },
  "62": { name: "Healthcare" },
  "51": { name: "Information" },
  "31": { name: "Manufacturing" },
  "21": { name: "Mining & Gas" },
  "54": { name: "Professional Services" },
  "44": { name: "Retail" },
  "22": { name: "Utilities" },
  "42": { name: "Wholesale" },
};

export const BreadcrumbNav = () => {
  const { currentStep, setCurrentStep, data } = useWizard();
  const steps = ["industry", "companySize", "role", "scenario"] as const;

  return (
    <div className="flex gap-2 mb-6">
      {steps.map((step, index) => (
        <button
          key={step}
          onClick={() => setCurrentStep(index)}
          className={`px-3 py-1 rounded-full text-sm transition-all ${
            index === currentStep
              ? "bg-primary text-white"
              : data[step]
              ? "bg-gray-100 hover:bg-gray-200"
              : "bg-gray-50 text-gray-400"
          }`}
        >
          {stepLabels[step].getLabel(data[step])}
        </button>
      ))}
    </div>
  );
};
