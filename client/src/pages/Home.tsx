import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardProvider } from "@/components/wizard/WizardContext";
import IndustryStep from "@/components/steps/IndustryStep";
import CompanyStep from "@/components/steps/CompanyStep";
import RoleStep from "@/components/steps/RoleStep";
import ScenarioStep from "@/components/steps/ScenarioStep";
import TrialStructure from "@/components/TrialStructure";

const Home = () => {
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Trial Employment Framework Generator
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {!showResults ? "Configure Your Trial Framework" : "Generated Trial Structure"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WizardProvider onComplete={() => setShowResults(true)}>
              {!showResults ? (
                <>
                  <IndustryStep />
                  <CompanyStep />
                  <RoleStep />
                  <ScenarioStep />
                </>
              ) : (
                <TrialStructure />
              )}
            </WizardProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
