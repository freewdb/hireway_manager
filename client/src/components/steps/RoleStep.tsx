
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWizard } from "../wizard/WizardContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import WizardStep from "../wizard/WizardStep";
import type { JobTitleSearchResult } from "@/types/schema";

export const RoleStep = () => {
  const { updateData } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedTitle, setSelectedTitle] = useState<JobTitleSearchResult | null>(null);

  const { data: searchResults, isLoading } = useQuery<{ items: JobTitleSearchResult[] }>({
    queryKey: ['jobSearch', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return { items: [] };
      const response = await fetch(`/api/soc/search?search=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
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
          searchTerm.length >= 2 && (
            <>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : searchResults?.items?.length ? (
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="space-y-2 p-2">
                    {searchResults.items.map((jobTitle) => (
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
