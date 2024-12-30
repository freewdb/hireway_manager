interface WizardData {
  industry: string;
  companySize: string;
  companyStage: string;
  location: string;
  role: string;
  scenario: string;
}

interface TrialStructure {
  trialLength: number;
  evaluationPoints: Array<{
    week: number;
    focus: string;
  }>;
  stakeholders: number;
  metrics: string[];
}

export function generateTrialStructure(data: WizardData): TrialStructure {
  // Base trial length depends on company size and stage
  let trialLength = 6; // default
  if (data.companySize === "large" || data.companyStage === "established") {
    trialLength = 8;
  } else if (data.companySize === "small" && data.companyStage === "startup") {
    trialLength = 4;
  }

  // Generate evaluation points based on trial length
  const evaluationPoints = [];
  for (let week = 1; week <= trialLength; week += 2) {
    let focus = "";
    if (week === 1) {
      focus = "Initial onboarding and role understanding";
    } else if (week === trialLength) {
      focus = "Final evaluation and decision point";
    } else {
      focus = "Progress review and feedback session";
    }
    evaluationPoints.push({ week, focus });
  }

  // Determine stakeholders based on company size
  const stakeholders = data.companySize === "small" ? 2 :
    data.companySize === "medium" ? 3 : 4;

  // Generate metrics based on role and scenario
  const metrics = [
    "Performance against role-specific KPIs",
    "Cultural fit and team collaboration",
    "Communication effectiveness",
  ];

  // Add scenario-specific metrics
  if (data.scenario === "new") {
    metrics.push("Ability to define and establish role parameters");
  } else if (data.scenario === "replacement") {
    metrics.push("Knowledge transfer and process continuity");
  } else if (data.scenario === "expansion") {
    metrics.push("Team integration and scaling capability");
  }

  // Add industry-specific metrics
  if (data.industry === "tech") {
    metrics.push("Technical proficiency and problem-solving");
  } else if (data.industry === "health") {
    metrics.push("Compliance and safety protocols adherence");
  }

  return {
    trialLength,
    evaluationPoints,
    stakeholders,
    metrics,
  };
}
