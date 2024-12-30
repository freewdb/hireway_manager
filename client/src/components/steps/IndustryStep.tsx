import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const industries = [
  { code: "tech", name: "Technology" },
  { code: "mfg", name: "Manufacturing" },
  { code: "health", name: "Healthcare" },
  { code: "fin", name: "Financial Services" },
  { code: "retail", name: "Retail" },
];

const IndustryStep = () => {
  const { updateData, data } = useWizard();

  return (
    <WizardStep title="Select Industry" stepNumber={0}>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Choose the industry that best describes your company.
        </p>
        
        <Select
          value={data.industry}
          onValueChange={(value) => updateData("industry", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry.code} value={industry.code}>
                {industry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </WizardStep>
  );
};

export default IndustryStep;
