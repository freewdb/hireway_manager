
import { useWizard } from "./wizard/WizardContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const industryDescriptions: Record<string, string> = {
  "11": "Companies in agriculture, forestry, fishing and hunting focus on growing crops, raising animals, harvesting timber, and harvesting fish and other animals from their natural habitats.",
  "21": "The mining, quarrying, and oil and gas extraction sector involves extracting natural mineral solids, liquid minerals, and gases through various methods such as quarrying, drilling, and pumping.",
  "22": "The utilities sector provides electric power, natural gas, steam supply, water supply, and sewage removal to businesses and households.",
  "23": "Construction sector companies are primarily engaged in building construction, engineering projects, and specialized trade contractors.",
  "31-33": "Manufacturing companies transform materials, substances, or components into new products through mechanical, physical, or chemical processes.",
  "42": "The wholesale trade sector sells merchandise to other businesses, typically from warehouses or offices, rather than directly to the general public.",
  "44-45": "Retail trade sector involves selling merchandise directly to consumers for personal or household use through physical stores, online platforms, or other channels.",
  "48-49": "The transportation and warehousing sector encompasses industries that transport goods and people, as well as those that store goods and manage logistics.",
  "51": "Information sector companies create, process, and distribute information and cultural products, including data, voice, text, sound, and video.",
  "52": "The finance and insurance sector encompasses establishments primarily engaged in financial transactions and facilitating such transactions, including banking, investments, and insurance services.",
  "53": "The real estate and rental and leasing sector includes companies involved in selling, renting, or leasing real estate and related services.",
  "54": "Professional, scientific, and technical services companies specialize in performing activities requiring a high degree of expertise and training, such as legal, accounting, engineering, and consulting services.",
  "55": "The management of companies and enterprises sector includes establishments that hold and manage the securities or assets of other companies for the purpose of owning a controlling interest or influencing management decisions.",
  "56": "The administrative and support and waste management and remediation sector provides a range of services, including office administration, hiring and placement, and waste disposal and remediation.",
  "61": "Educational services sector consists of establishments that provide instruction and training in a wide variety of subjects, including primary, secondary, higher education, and specialized training.",
  "62": "The health care and social assistance sector provides care for individuals through medical services, social assistance, and related support.",
  "71": "Organizations in arts, entertainment, and recreation operate facilities or provide services to meet varied cultural, entertainment, and recreational interests.",
  "72": "The accommodation and food services sector includes establishments that provide lodging, meals, snacks, and beverages for immediate consumption.",
  "81": "Other services, except public administration, include a variety of services such as repair and maintenance, personal care, and religious organizations.",
  "92": "The public administration sector comprises federal, state, and local government agencies that administer, oversee, and manage public programs and services."
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
