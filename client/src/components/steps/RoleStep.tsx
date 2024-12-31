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
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

interface JobTitle {
  title: string;
  code: string;
  isAlternative: boolean;
  rank?: number;
}

const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300); // Debounce search input by 300ms
  const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(
    data.role ? { title: data.roleTitle || "", code: data.role, isAlternative: false } : null
  );

  // Fetch job titles with debounced search
  const { data: titles, isLoading } = useQuery<JobTitle[]>({
    queryKey: ["/api/job-titles", { search: debouncedSearch }],
    enabled: debouncedSearch.length >= 2 // Only search when 2 or more characters are entered
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
          searchTerm && searchTerm.length >= 2 && (
            <>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                titles && titles.length > 0 && (
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
            </>
          )
        )}
      </div>
    </WizardStep>
  );
};

export default RoleStep;