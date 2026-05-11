export interface CourseConfig {
  id: string;
  name: string;
  shortName: string;
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface WindowDefinition {
  key: "morning" | "midday" | "evening";
  label: "AM" | "Mid" | "PM";
  longLabel: "Morning" | "Midday" | "Evening";
  startHour: number;
  endHour: number;
  clipToSunrise: boolean;
  clipToSunset: boolean;
}

export const course: CourseConfig = {
  id: "the_meadows",
  name: "The Meadows Golf and Country Club",
  shortName: "The Meadows G&CC",
  city: "Carlsbad Springs (Ottawa), Ontario, Canada",
  latitude: 45.3438,
  longitude: -75.4731,
  timeZone: "America/Toronto",
};

export const windows: WindowDefinition[] = [
  {
    key: "morning",
    label: "AM",
    longLabel: "Morning",
    startHour: 7,
    endHour: 11,
    clipToSunrise: true,
    clipToSunset: false,
  },
  {
    key: "midday",
    label: "Mid",
    longLabel: "Midday",
    startHour: 11,
    endHour: 15,
    clipToSunrise: false,
    clipToSunset: false,
  },
  {
    key: "evening",
    label: "PM",
    longLabel: "Evening",
    startHour: 15,
    endHour: 19,
    clipToSunrise: false,
    clipToSunset: true,
  },
];

export const calendarName: string =
  process.env.GOLFCAST_CALENDAR_NAME ?? "⛳ GolfCast";

export const forecastDays = 7;
export const bestWindowHours = 4;
