import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./WizardContext";

interface WizardStepProps {
  children: ReactNode;
  title: string;
  stepNumber: number;
}

const WizardStep = ({ children, title, stepNumber }: WizardStepProps) => {
  const { currentStep, nextStep, prevStep, data } = useWizard();

  // Check if the current step has a value
  const isStepComplete = () => {
    switch (stepNumber) {
      case 0:
        return !!data.industry;
      case 1:
        return !!data.companySize && !!data.companyStage;
      case 2:
        // Check for both role code and title
        return !!data.role && !!data.roleTitle;
      case 3:
        return !!data.scenario;
      default:
        return false;
    }
  };

  if (currentStep !== stepNumber) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Step {stepNumber + 1}: {title}</h3>
        <div className="h-2 w-full bg-gray-200 rounded-full">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((stepNumber + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {children}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={stepNumber === 0}
        >
          Previous
        </Button>
        <Button
          onClick={nextStep}
          disabled={!isStepComplete()}
        >
          {stepNumber === 3 ? "Generate Trial Plan" : "Next"}
        </Button>
      </div>
    </div>
  );
};

export default WizardStep;