import WizardStep from "../wizard/WizardStep";
import { useWizard } from "../wizard/WizardContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Autocomplete } from '@react-google-maps/api';
import { useState } from 'react';

export const CompanyStep = () => {
  const { updateData, data } = useWizard();
  const [searchBox, setSearchBox] = useState<google.maps.places.Autocomplete | null>(null);

  return (
    <WizardStep title="Company Details" stepNumber={1}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Company Size</Label>
          <Select
            value={data.companySize}
            onValueChange={(value) => updateData("companySize", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (1-50 employees)</SelectItem>
              <SelectItem value="medium">Medium (51-500 employees)</SelectItem>
              <SelectItem value="large">Large (500+ employees)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Company Stage</Label>
          <Select
            value={data.companyStage}
            onValueChange={(value) => updateData("companyStage", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startup">Startup</SelectItem>
              <SelectItem value="scaling">Scaling Business</SelectItem>
              <SelectItem value="established">Established Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location (Optional)</Label>
          <Autocomplete
            onLoad={setSearchBox}
            onPlaceChanged={() => {
              const place = searchBox?.getPlace();
              if (place?.address_components) {
                const stateObj = place.address_components.find(
                  comp => comp.types.includes('administrative_area_level_1')
                );
                if (stateObj) {
                  updateData("location", stateObj.short_name);
                }
              }
            }}
          >
            <Input
              placeholder="Enter company location"
              value={data.location || ''}
              onChange={(e) => updateData("location", e.target.value)}
            />
          </Autocomplete>
        </div>
      </div>
    </WizardStep>
  );
};

export default CompanyStep;