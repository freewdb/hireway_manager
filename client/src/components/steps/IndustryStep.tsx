import { useQuery } from "@tanstack/react-query";
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Industry {
  id: number;
  name: string;
  naicsCode: string;
}

const IndustryStep = () => {
  const { updateData, data } = useWizard();

  const { data: industries, isLoading } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  if (isLoading) {
    return (
      <WizardStep title="Select Industry" stepNumber={0}>
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </WizardStep>
    );
  }

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
            {industries?.map((industry) => (
              <SelectItem key={industry.id} value={industry.naicsCode}>
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