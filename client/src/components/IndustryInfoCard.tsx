
import { useWizard } from "./wizard/WizardContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const industryDescriptions: Record<string, string> = {
  "11": "Companies in agriculture, forestry, fishing and hunting focus on growing crops, raising animals, harvesting timber, and harvesting fish and other animals from their natural habitats.",
  "71": "Organizations in arts, entertainment, and recreation operate facilities or provide services to meet varied cultural, entertainment, and recreational interests.",
  "23": "Construction sector companies are primarily engaged in building construction, engineering projects, and specialized trade contractors.",
  "52": "Finance and insurance sector encompasses establishments primarily engaged in financial transactions and facilitating such transactions.",
  "62": "Health care and social assistance sector provides care for individuals through medical services, social assistance, and associated services.",
  "51": "Information sector companies create, process, and distribute information and cultural products, including data, voice, text, sound, and video.",
  "31": "Manufacturing companies transform materials, substances, or components into new products through mechanical, physical, or chemical processes.",
  "21": "Mining sector extracts naturally occurring mineral solids, liquid minerals, and gases from the earth through quarrying, well operations, and other methods.",
  "54": "Professional services companies specialize in performing professional, scientific, and technical activities requiring a high degree of expertise and training.",
  "44": "Retail trade sector sells merchandise to the general public for personal or household consumption.",
  "22": "Utilities sector provides electric power, natural gas, steam supply, water supply, and sewage removal.",
  "42": "Wholesale trade sector sells merchandise to other businesses and normally operates from a warehouse or office."
};

export const IndustryInfoCard = () => {
  const { data } = useWizard();
  
  if (!data.industry) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Industry Information</span>
          <span className="text-sm text-muted-foreground">{data.industry}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {industryDescriptions[data.industry] || "Industry description not available."}
        </p>
      </CardContent>
    </Card>
  );
};
