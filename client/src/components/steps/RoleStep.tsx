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

interface MinorGroup {
  code: string;
  title: string;
  description: string;
  majorGroupCode: string;
  occupations: DetailedOccupation[];
}

interface MajorGroup {
  code: string;
  title: string;
  description: string;
  minorGroups: MinorGroup[];
}

const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState(data.role || "");
  const [selectedPath, setSelectedPath] = useState<{
    major?: MajorGroup;
    minor?: MinorGroup;
    occupation?: DetailedOccupation;
  }>({});

  // Fetch SOC hierarchy
  const { data: socData, isLoading } = useQuery<{
    majorGroups: MajorGroup[];
  }>({
    queryKey: ["/api/soc-hierarchy"],
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Reset selection if search is cleared
    if (!term) {
      setSelectedPath({});
      updateData("role", "");
    }
  };

  const handleSelect = (occupation: DetailedOccupation, minorGroup: MinorGroup, majorGroup: MajorGroup) => {
    setSelectedPath({
      major: majorGroup,
      minor: minorGroup,
      occupation: occupation,
    });
    setSearchTerm(occupation.title);
    updateData("role", occupation.code); // Store SOC code as the role value
  };

  // Filter and search across all levels
  const filterResults = () => {
    if (!socData?.majorGroups || !searchTerm) return [];

    const results: Array<{
      majorGroup: MajorGroup;
      minorGroup: MinorGroup;
      occupation: DetailedOccupation;
    }> = [];

    socData.majorGroups.forEach(major => {
      major.minorGroups.forEach(minor => {
        minor.occupations.forEach(occupation => {
          const searchableText = `
            ${occupation.title.toLowerCase()}
            ${occupation.alternativeTitles.join(" ").toLowerCase()}
            ${occupation.description.toLowerCase()}
          `;

          if (searchableText.includes(searchTerm.toLowerCase())) {
            results.push({ majorGroup: major, minorGroup: minor, occupation });
          }
        });
      });
    });

    return results;
  };

  return (
    <WizardStep title="Select Role" stepNumber={2}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search Job Title or Role</Label>
          <Input
            placeholder="Type to search roles (e.g., Software Developer, IT Manager)"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {selectedPath.occupation ? (
          <div className="space-y-2 p-4 border rounded-md bg-muted/50">
            <div className="text-sm text-muted-foreground">Selected Classification:</div>
            <Accordion type="single" collapsible>
              <AccordionItem value="path">
                <AccordionTrigger className="text-primary">
                  {selectedPath.occupation.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    <div>Major Group: {selectedPath.major?.title}</div>
                    <div>Minor Group: {selectedPath.minor?.title}</div>
                    <div>SOC Code: {selectedPath.occupation.code}</div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          searchTerm && (
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-2">
                {filterResults().map(({ majorGroup, minorGroup, occupation }) => (
                  <Button
                    key={occupation.code}
                    variant="ghost"
                    className="w-full justify-start font-normal text-left"
                    onClick={() => handleSelect(occupation, minorGroup, majorGroup)}
                  >
                    <div>
                      <div className="font-medium">{occupation.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {minorGroup.title} | {majorGroup.title}
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