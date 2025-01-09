
import { useState } from "react";
import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export const industries = [
  { code: "11", name: "Agriculture, Forestry, Fishing and Hunting" },
  { code: "21", name: "Mining, Quarrying, and Oil and Gas Extraction" },
  { code: "22", name: "Utilities" },
  { code: "23", name: "Construction" },
  { code: "31-33", name: "Manufacturing" },
  { code: "42", name: "Wholesale Trade" },
  { code: "44-45", name: "Retail Trade" },
  { code: "48-49", name: "Transportation and Warehousing" },
  { code: "51", name: "Information" },
  { code: "52", name: "Finance and Insurance" },
  { code: "53", name: "Real Estate and Rental and Leasing" },
  { code: "54", name: "Professional, Scientific, and Technical Services" },
  { code: "55", name: "Management of Companies and Enterprises" },
  { code: "56", name: "Administrative and Support and Waste Management and Remediation" },
  { code: "61", name: "Education Services" },
  { code: "62", name: "Health Care and Social Assistance" },
  { code: "71", name: "Arts, Entertainment, and Recreation" },
  { code: "72", name: "Accommodation and Food Services" },
  { code: "81", name: "Other Services, Except Public Administration" },
  { code: "92", name: "Public Administration" }
].sort((a, b) => a.code.localeCompare(b.code));

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

export const IndustryStep = () => {
  const { updateData, data } = useWizard();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredIndustries = industries.filter(industry => 
    industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.code.includes(searchTerm)
  );

  return (
    <WizardStep title="Select Industry" stepNumber={0}>
      <div className="space-y-4">
        <p className="text-muted-foreground font-sf-pro">
          Choose the industry that best describes your company.
        </p>

        <div className="relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search industries..."
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {isOpen && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-auto">
              {filteredIndustries.map((industry) => (
                <li
                  key={industry.code}
                  onClick={() => {
                    updateData("industry", industry.code);
                    setSearchTerm(`${industry.code} - ${industry.name}`);
                    setIsOpen(false);
                  }}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-mono text-sm text-blue-600">{industry.code}</span>
                    <span className="font-medium">{industry.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {industryDescriptions[industry.code]}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data.industry && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{industries.find(i => i.code === data.industry)?.name}</span>
                <span className="text-sm font-bold text-muted-foreground">
                  NAICS {data.industry}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {industryDescriptions[data.industry]}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStep>
  );
};

export default IndustryStep;
