
import { useWizard } from "./wizard/WizardContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

export const RoleInfoCard = () => {
  const { data } = useWizard();
  
  if (!data.role) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>{data.roleTitle}</span>
          <span className="text-sm text-muted-foreground">{data.role}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Description</h4>
          <p className="text-muted-foreground">{data.roleDescription}</p>
        </div>
        {data.alternativeTitles?.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Alternative Titles</h4>
            <div className="flex flex-wrap gap-2">
              {data.alternativeTitles.map((title, index) => (
                <span key={index} className="bg-secondary px-2 py-1 rounded-md text-sm">
                  {title}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
