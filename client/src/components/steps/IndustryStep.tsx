
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const industries = [
  { code: "11", name: "Agriculture, Forestry, Fishing and Hunting" },
  { code: "21", name: "Mining, Quarrying, and Oil and Gas Extraction" },
  { code: "22", name: "Utilities" },
  { code: "23", name: "Construction" },
  { code: "31", name: "Manufacturing" },
  { code: "42", name: "Wholesale Trade" },
  { code: "44", name: "Retail Trade" },
  { code: "51", name: "Information" },
  { code: "52", name: "Finance and Insurance" },
  { code: "54", name: "Professional, Scientific, and Technical Services" },
  { code: "62", name: "Health Care and Social Assistance" },
  { code: "71", name: "Arts, Entertainment, and Recreation" },
  { code: "72", name: "Accommodation and Food Services" }
];

export const IndustryStep = () => {
  const { updateData, data } = useWizard();

  return (
    <WizardStep title="Select Industry" stepNumber={0}>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Choose the industry that best describes your company.
        </p>

        <Select
          value={data.industry}
          onValueChange={(value) => {
            updateData("industry", value);
          }}
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
