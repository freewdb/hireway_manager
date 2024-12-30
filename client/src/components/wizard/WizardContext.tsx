import { createContext, useContext, useState, ReactNode } from "react";

interface WizardData {
  industry: string;
  companySize: string;
  companyStage: string;
  location: string;
  role: string;
  scenario: string;
}

interface WizardContextType {
  currentStep: number;
  data: WizardData;
  updateData: (field: keyof WizardData, value: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  isComplete: boolean;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ 
  children, 
  onComplete 
}: { 
  children: ReactNode;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    industry: "",
    companySize: "",
    companyStage: "",
    location: "",
    role: "",
    scenario: "",
  });

  const updateData = (field: keyof WizardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isComplete = Object.values(data).every(value => value !== "");

  return (
    <WizardContext.Provider value={{
      currentStep,
      data,
      updateData,
      nextStep,
      prevStep,
      isComplete,
    }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
