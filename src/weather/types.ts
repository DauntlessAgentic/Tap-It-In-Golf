export interface HourlyForecast {
  time: string;
  temperatureC: number;
  rainProbabilityPct: number;
  precipitationMm: number;
  thunderstormProbabilityPct: number;
  windSpeedKmh: number;
  windGustKmh: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  sunrise: string;
  sunset: string;
  tempMinC: number;
  tempMaxC: number;
}

export interface ForecastBundle {
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  fetchedAt: string;
}

export interface WindowSummary {
  startIso: string;
  endIso: string;
  tempMinC: number;
  tempMaxC: number;
  rainProbabilityPct: number;
  precipitationMm: number;
  thunderstormProbabilityPct: number;
  windAvgKmh: number;
  windGustMaxKmh: number;
  conditionSummary: string;
  frostDelayRisk: boolean;
  outsideDaylight: boolean;
  hours: HourlyForecast[];
}
