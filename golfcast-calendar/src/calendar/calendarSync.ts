import type { calendar_v3 } from "googleapis";
import type { RecommendationEvent } from "../recommendations/buildDailyRecommendations.js";
import { course } from "../config/golfcast.config.js";

const SOURCE_TAG = "golfcast";

export interface SyncResult {
  inserted: number;
  updated: number;
  skipped: number;
}

function eventKey(event: RecommendationEvent): string {
  return `${event.date}|${event.windowKey}|${course.id}`;
}

function buildEventResource(
  event: RecommendationEvent,
): calendar_v3.Schema$Event {
  return {
    summary: event.title,
    description: event.description,
    start: { dateTime: event.startIso, timeZone: course.timeZone },
    end: { dateTime: event.endIso, timeZone: course.timeZone },
    transparency: "transparent",
    colorId: event.colorId,
    location: `${course.shortName}, ${course.city}`,
    extendedProperties: {
      private: {
        source: SOURCE_TAG,
        date: event.date,
        window: event.windowKey,
        location: course.id,
      },
    },
  };
}

export async function syncRecommendations(
  api: calendar_v3.Calendar,
  calendarId: string,
  events: RecommendationEvent[],
): Promise<SyncResult> {
  const existing = await listExistingEvents(api, calendarId);
  const existingByKey = new Map<string, calendar_v3.Schema$Event>();
  for (const e of existing) {
    const p = e.extendedProperties?.private ?? {};
    const key = `${p.date}|${p.window}|${p.location}`;
    existingByKey.set(key, e);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    if (!event.startIso || !event.endIso) {
      skipped++;
      continue;
    }
    const key = eventKey(event);
    const resource = buildEventResource(event);
    const match = existingByKey.get(key);
    if (match?.id) {
      await api.events.update({
        calendarId,
        eventId: match.id,
        requestBody: resource,
      });
      updated++;
    } else {
      await api.events.insert({
        calendarId,
        requestBody: resource,
      });
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

async function listExistingEvents(
  api: calendar_v3.Calendar,
  calendarId: string,
): Promise<calendar_v3.Schema$Event[]> {
  const all: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await api.events.list({
      calendarId,
      privateExtendedProperty: [`source=${SOURCE_TAG}`],
      maxResults: 2500,
      showDeleted: false,
      singleEvents: true,
      pageToken,
    });
    if (res.data.items) all.push(...res.data.items);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return all;
}
