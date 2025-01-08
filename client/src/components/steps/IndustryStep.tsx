import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon } from "lucide-react";
import { IndustryInfoCard } from "../IndustryInfoCard"; // Added import

const industries = [
  { code: "11", name: "Agriculture, Forestry, Fishing and Hunting" },
  { code: "21", name: "Mining, Quarrying, and Oil and Gas Extraction" },
  { code: "22", name: "Utilities" },
  { code: "23", name: "Construction" },
  { code: "31-33", name: "Manufacturing" },
  { code: "42", name: "Wholesale Trade" },
  { code: "44-45", name: "Retail Trade" },
  { code: "48-49", name: "Transportation and Warehousing" },
  { code: "51", name: "Information" },
  { code: "52", name: "Finance and Insurance" },
  { code: "53", name: "Real Estate and Rental and Leasing" },
  { code: "54", name: "Professional, Scientific, and Technical Services" },
  { code: "55", name: "Management of Companies and Enterprises" },
  { code: "56", name: "Administrative and Support and Waste Management and Remediation" },
  { code: "61", name: "Education Services" },
  { code: "62", name: "Health Care and Social Assistance" },
  { code: "71", name: "Arts, Entertainment, and Recreation" },
  { code: "72", name: "Accomodation and Food Services" },
  { code: "81", name: "Other Services, Except Public Administration" },
  { code: "92", name: "Public Administration" }
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
        <IndustryInfoCard industryCode={data.industry} /> {/* Added IndustryInfoCard */}
      </div>
    </WizardStep>
  );
};

export default IndustryStep;