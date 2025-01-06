
import { motion } from "framer-motion";
import { useWizard } from "./wizard/WizardContext";

const stepColors = {
  0: "bg-blue-500",
  1: "bg-green-500", 
  2: "bg-purple-500",
  3: "bg-orange-500"
};

const stepNames = {
  0: "Industry",
  1: "Company",
  2: "Role",
  3: "Scenario"
};

export const BreadcrumbNav = () => {
  const { currentStep, setCurrentStep, data } = useWizard();
  
  const isStepComplete = (step: number) => {
    switch (step) {
      case 0: return !!data.industry;
      case 1: return !!data.companySize && !!data.companyStage;
      case 2: return !!data.role;
      case 3: return !!data.scenario;
      default: return false;
    }
  };

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {[0,1,2,3].map((step) => (
        <motion.button
          key={step}
          initial={{ scale: 0 }}
          animate={{ 
            scale: isStepComplete(step) ? 1 : 0,
            opacity: isStepComplete(step) ? 1 : 0
          }}
          whileTap={{ scale: 0.95 }}
          className={`${stepColors[step as keyof typeof stepColors]} 
            text-white px-3 py-1 rounded-full text-sm font-medium
            cursor-pointer transition-shadow hover:shadow-lg`}
          onClick={() => setCurrentStep(step)}
        >
          {stepNames[step as keyof typeof stepNames]}
        </motion.button>
      ))}
    </div>
  );
};
