import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

interface JobTitle {
  code: string;
  title: string;
  isAlternative: boolean;
  rank?: number;
  description?: string;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
}

const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(null);

  const { data: titles = [], isLoading, error } = useQuery<JobTitle[]>({
    queryKey: ["/api/job-titles", { search: debouncedSearch }],
    enabled: debouncedSearch.length >= 2,
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setSelectedTitle(null);
      updateData("role", "");
    }
  };

  const handleSelect = (jobTitle: JobTitle) => {
    setSelectedTitle(jobTitle);
    setSearchTerm(jobTitle.title);
    updateData("role", jobTitle.code);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Occupation</CardTitle>
          <CardDescription>
            Search for a job title or role to get the correct SOC classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-search">Search Job Title or Role</Label>
              <Input
                id="role-search"
                placeholder="Type to search (e.g., Software Developer, IT Manager)"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {selectedTitle ? (
              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-base">Selected Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedTitle.title}</p>
                    <p className="text-sm text-muted-foreground">
                      SOC Code: {selectedTitle.code}
                    </p>
                    {selectedTitle.isAlternative && (
                      <p className="text-sm text-muted-foreground">
                        Alternative title for standard occupation
                      </p>
                    )}
                    {selectedTitle.description && (
                      <p className="text-sm mt-2">{selectedTitle.description}</p>
                    )}
                    {selectedTitle.majorGroup && (
                      <p className="text-sm text-muted-foreground">
                        Major Group: {selectedTitle.majorGroup.title}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              searchTerm && (
                <>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : error ? (
                    <div className="text-sm text-destructive p-4 border border-destructive/50 rounded-md">
                      Error loading results. Please try again.
                    </div>
                  ) : (
                    titles.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {titles.map((jobTitle) => (
                            <Button
                              key={`${jobTitle.code}-${jobTitle.title}`}
                              variant="ghost"
                              className="w-full justify-start font-normal"
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
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md">
                        No matching roles found. Try different search terms.
                      </div>
                    )
                  )}
                </>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleStep;