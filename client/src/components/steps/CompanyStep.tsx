import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CompanyStep = () => {
  const { updateData, data } = useWizard();

  return (
    <WizardStep title="Company Details" stepNumber={1}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Company Size</Label>
          <Select
            value={data.companySize}
            onValueChange={(value) => updateData("companySize", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (1-50 employees)</SelectItem>
              <SelectItem value="medium">Medium (51-500 employees)</SelectItem>
              <SelectItem value="large">Large (500+ employees)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Company Stage</Label>
          <Select
            value={data.companyStage}
            onValueChange={(value) => updateData("companyStage", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startup">Startup</SelectItem>
              <SelectItem value="scaling">Scaling Business</SelectItem>
              <SelectItem value="established">Established Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location (Optional)</Label>
          <Input
            placeholder="e.g., New York, USA"
            value={data.location}
            onChange={(e) => updateData("location", e.target.value)}
          />
        </div>
      </div>
    </WizardStep>
  );
};

export default CompanyStep;