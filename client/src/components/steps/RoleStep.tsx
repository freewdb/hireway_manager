import { useState } from "react";
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const commonRoles = [
  "Software Engineer",
  "Sales Manager",
  "Marketing Manager",
  "Product Manager",
  "Financial Analyst",
  "Customer Support",
  "HR Manager",
  "Operations Manager",
];

const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoles = commonRoles.filter(role =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search or Enter Role Title</Label>
          <Input
            placeholder="Start typing to search roles..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              updateData("role", e.target.value);
            }}
          />
        </div>

        {searchTerm && (
          <ScrollArea className="h-48 border rounded-md p-2">
            <div className="space-y-2">
              {filteredRoles.map((role) => (
                <button
                  key={role}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent"
                  onClick={() => {
                    setSearchTerm(role);
                    updateData("role", role);
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </WizardStep>
  );
};

export default RoleStep;
