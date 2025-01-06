
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon } from "lucide-react";

const industries = [
  { code: "11", name: "Agriculture, Forestry, Fishing and Hunting" },
  { code: "71", name: "Arts, Entertainment, and Recreation" },
  { code: "23", name: "Construction" },
  { code: "52", name: "Finance and Insurance" },
  { code: "62", name: "Health Care and Social Assistance" },
  { code: "51", name: "Information" },
  { code: "31", name: "Manufacturing" },
  { code: "21", name: "Mining, Quarrying, and Oil and Gas Extraction" },
  { code: "54", name: "Professional, Scientific, and Technical Services" },
  { code: "44", name: "Retail Trade" },
  { code: "22", name: "Utilities" },
  { code: "42", name: "Wholesale Trade" }
].sort((a, b) => a.name.localeCompare(b.name));

export const IndustryStep = () => {
  const { updateData, data } = useWizard();

  return (
    <WizardStep title="Select Industry" stepNumber={0}>
      <div className="space-y-4">
        <p className="text-muted-foreground font-sf-pro">
          Choose the industry that best describes your company.
        </p>

        <Select.Root value={data.industry} onValueChange={(value) => updateData("industry", value)}>
          <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background">
            <Select.Value placeholder="Select an industry" />
            <Select.Icon>
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Select.Icon>
          </Select.Trigger>
          
          <Select.Portal>
            <Select.Content className="bg-white rounded-md shadow-lg">
              <Select.Viewport className="p-1">
                {industries.map((industry) => (
                  <Select.Item
                    key={industry.code}
                    value={industry.code}
                    className="relative flex items-center px-6 py-2 text-sm rounded-sm hover:bg-gray-100 focus:bg-gray-100 outline-none cursor-pointer font-sf-pro"
                  >
                    <Select.ItemText>{industry.code} - {industry.name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </WizardStep>
  );
};

export default IndustryStep;
