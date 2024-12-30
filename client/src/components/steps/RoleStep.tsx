import { useState } from "react";
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

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
  const [searchTerm, setSearchTerm] = useState(data.role || "");

  const filteredRoles = commonRoles.filter(role =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleSelect = (role: string) => {
    setSearchTerm(role);
    updateData("role", role);
  };

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search or Enter Role Title</Label>
          <Input
            placeholder="Start typing to search roles..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              updateData("role", value);
            }}
          />
        </div>

        {searchTerm && filteredRoles.length > 0 && (
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-1">
              {filteredRoles.map((role) => (
                <Button
                  key={role}
                  variant="ghost"
                  className="w-full justify-start font-normal hover:bg-accent"
                  onClick={() => handleRoleSelect(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </WizardStep>
  );
};

export default RoleStep;