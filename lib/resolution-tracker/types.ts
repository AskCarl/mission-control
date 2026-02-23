export type ResolutionRing = { label: string; percent: number };

export type ResolutionDashboard = {
  dateLabel: string;
  todayScore: number;
  streakCurrent: number;
  streakBest: number;
  weekProgressPercent: number;
  rings: ResolutionRing[];
  mostImportant: string;
  quickActions: { label: string; href: string }[];
  settings: {
    alcoholWeeklyLimit: number;
    workoutTargetDays: number;
  };
  incomeStream: {
    name: string;
    status: string;
    nextStep: string;
  };
};

export type ResolutionWeekly = {
  weightTrend7d: string;
  weightTrend30d: string;
  alcoholThisWeek: number;
  alcoholLimit: number;
  workoutsThisWeek: number;
  workoutTarget: number;
  readingMinutesThisMonth: number;
  readingTarget: number;
  cashflowProject: {
    name: string;
    status: string;
    nextStep: string;
  };
  themes: { name: string; percent: number }[];
  review: {
    weekStart: string;
    activeCashflowProject: string;
    projectStatus: string;
    nextStep: string;
    workedWell: string;
    improveNext: string;
  } | null;
};

export type ResolutionSettings = {
  profileId: string;
  timezone: string;
  weightTarget: number;
  fastingDays: string[];
  workoutTargetDays: number;
  alcoholWeeklyLimit: number;
  readingMonthlyMinutesTarget: number;
  reminderMorning: string;
  reminderEvening: string;
  scoreWeights: {
    nutrition: number;
    fitness: number;
    recovery: number;
    growth: number;
    finance: number;
  } | null;
  scoreWeightsVersion: number;
};

export type ScoreWeights = NonNullable<ResolutionSettings["scoreWeights"]>;

export type DailyCheckinPayload = {
  antiInflammatory: boolean;
  fastingDone: boolean;
  fakeSugarAvoided: boolean;
  sweetsControlled: boolean;
  avoidArtificialSweeteners: boolean;
  gutHealthSupport: boolean;
  workoutDone: boolean;
  workoutType: string | null;
  lowImpactFlex: boolean;
  alcoholDrinks: number;
  nicotineLevel: number;
  readingMinutes: number;
  frugalDay: boolean;
  notes: string | null;
  dailyScore: number;
};

export type WeeklyReviewPayload = {
  weekStart: string;
  activeCashflowProject: string;
  projectStatus: string;
  nextStep: string;
  workedWell: string | null;
  improveNext: string | null;
};

export type WeightLogPayload = {
  weightLbs: number;
  localDate?: string;
};

export type SettingsPayload = {
  fastingDays: string[];
  workoutTargetDays: number;
  alcoholWeeklyLimit: number;
  readingMonthlyMinutesTarget: number;
  reminderMorning: string;
  reminderEvening: string;
  weightTarget: number;
  scoreWeights: ResolutionSettings["scoreWeights"];
};
