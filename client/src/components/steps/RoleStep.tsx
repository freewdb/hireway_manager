import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DetailedOccupation {
  code: string;
  title: string;
  description: string;
  alternativeTitles: string[];
  minorGroupCode: string;
}

interface JobTitle {
  title: string;
  code: string;
  isAlternative: boolean;
}

const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(
    data.role ? { title: data.roleTitle || "", code: data.role, isAlternative: false } : null
  );

  // Fetch job titles
  const { data: titles } = useQuery<JobTitle[]>({
    queryKey: ["/api/job-titles", searchTerm],
    enabled: searchTerm.length > 0
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setSelectedTitle(null);
      updateData("role", "");
      updateData("roleTitle", "");
    }
  };

  const handleSelect = (jobTitle: JobTitle) => {
    setSelectedTitle(jobTitle);
    setSearchTerm(jobTitle.title);
    updateData("role", jobTitle.code);
    updateData("roleTitle", jobTitle.title);
  };

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role-search">Search Job Title or Role</Label>
          <Input
            id="role-search"
            placeholder="Type to search roles (e.g., Software Developer, IT Manager)"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {selectedTitle ? (
          <div className="space-y-2 p-4 border rounded-md bg-muted/50">
            <div className="text-sm text-muted-foreground">Selected Role:</div>
            <Accordion type="single" collapsible>
              <AccordionItem value="role">
                <AccordionTrigger className="text-primary">
                  {selectedTitle.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    <div>SOC Code: {selectedTitle.code}</div>
                    {selectedTitle.isAlternative && (
                      <div className="text-sm text-muted-foreground">
                        Alternative title for standard occupation
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          searchTerm && titles && titles.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-2">
                {titles.map((jobTitle) => (
                  <Button
                    key={`${jobTitle.code}-${jobTitle.title}`}
                    variant="ghost"
                    className="w-full justify-start font-normal text-left"
                    onClick={() => handleSelect(jobTitle)}
                  >
                    <div>
                      <div className="font-medium">{jobTitle.title}</div>
                      <div className="text-sm text-muted-foreground">
                        SOC Code: {jobTitle.code}
                        {jobTitle.isAlternative && " (Alternative Title)"}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )
        )}
      </div>
    </WizardStep>
  );
};

export default RoleStep;