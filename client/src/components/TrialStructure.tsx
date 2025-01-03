import { useWizard } from "./wizard/WizardContext";
import { Card, CardContent } from "@/components/ui/card";
import { generateTrialStructure } from "@/lib/trialGenerator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, CheckSquare, Users } from "lucide-react";

export const TrialStructure = () => {
  const { data } = useWizard();
  const trialStructure = generateTrialStructure(data);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Trial Length</h3>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {trialStructure.trialLength} Weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Evaluation Points</h3>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {trialStructure.evaluationPoints.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Key Stakeholders</h3>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {trialStructure.stakeholders}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Evaluation Schedule</h3>
        <div className="space-y-2">
          {trialStructure.evaluationPoints.map((point, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg bg-background"
            >
              <h4 className="font-medium">Week {point.week}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {point.focus}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Key Success Metrics</h3>
        <ul className="space-y-2">
          {trialStructure.metrics.map((metric, index) => (
            <li
              key={index}
              className="flex items-center space-x-2"
            >
              <span className="h-2 w-2 bg-primary rounded-full" />
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => window.location.reload()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Start Over
      </Button>
    </div>
  );
};

export default TrialStructure;