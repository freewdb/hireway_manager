
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import WizardStep from "../wizard/WizardStep";
import type { JobTitleSearchResult } from "@db/schema";

export const RoleStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedTitle, setSelectedTitle] = useState<JobTitleSearchResult | null>(null);

  const { data: titles = [], isLoading, error } = useQuery<JobTitleSearchResult[]>({
    queryKey: ["/api/job-titles", { search: debouncedSearch }],
    enabled: debouncedSearch.length >= 2,
    refetchOnWindowFocus: false,
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSelectedTitle(null);
      updateData("role", "");
    }
  };

  const handleSelect = (jobTitle: JobTitleSearchResult) => {
    setSelectedTitle(jobTitle);
    setSearchTerm(jobTitle.title);
    updateData("role", jobTitle.code);
  };

  const showSearchResults = searchTerm && !selectedTitle && debouncedSearch.length >= 2;

  return (
    <WizardStep title="Select Role" stepNumber={2}>
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
            <CardContent className="pt-6">
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
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => {
                    setSelectedTitle(null);
                    setSearchTerm("");
                    updateData("role", "");
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          showSearchResults && (
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
              ) : titles.length > 0 ? (
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="space-y-2 p-2">
                    {titles.map((jobTitle) => (
                      <Button
                        key={`${jobTitle.code}-${jobTitle.title}`}
                        variant="ghost"
                        className="w-full justify-start font-normal"
                        onClick={() => handleSelect(jobTitle)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{jobTitle.title}</div>
                          <div className="text-sm text-muted-foreground">
                            SOC Code: {jobTitle.code}
                            {jobTitle.isAlternative && " (Alternative Title)"}
                          </div>
                          {jobTitle.majorGroup && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {jobTitle.majorGroup.title}
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground p-4 border rounded-md">
                  No matching roles found. Try different search terms.
                </div>
              )}
            </>
          )
        )}
      </div>
    </WizardStep>
  );
};

export default RoleStep;
