import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const scenarios = [
  {
    id: "new",
    title: "New Role",
    description: "Creating a new position with no previous benchmark",
  },
  {
    id: "replacement",
    title: "Replacement",
    description: "Filling a previously existing position",
  },
  {
    id: "expansion",
    title: "Team Expansion",
    description: "Adding headcount to an existing team",
  },
];

export const ScenarioStep = () => {
  const { updateData, data } = useWizard();

  return (
    <WizardStep title="Hiring Scenario" stepNumber={3}>
      <RadioGroup
        value={data.scenario}
        onValueChange={(value) => updateData("scenario", value)}
        className="space-y-4"
      >
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="flex items-center space-x-3 space-y-0"
          >
            <RadioGroupItem value={scenario.id} id={scenario.id} />
            <Label
              htmlFor={scenario.id}
              className="flex flex-col cursor-pointer"
            >
              <span className="font-medium">{scenario.title}</span>
              <span className="text-sm text-muted-foreground">
                {scenario.description}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </WizardStep>
  );
};

export default ScenarioStep;