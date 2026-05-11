import { google, type calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface GoogleAuthEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
}

export function readGoogleAuthEnv(): GoogleAuthEnv {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error(
      "Missing Google OAuth env vars. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN. Run `npm run auth:google` first.",
    );
  }
  return { clientId, clientSecret, redirectUri, refreshToken };
}

export function buildOAuthClient(env: GoogleAuthEnv): OAuth2Client {
  const client = new google.auth.OAuth2(
    env.clientId,
    env.clientSecret,
    env.redirectUri,
  );
  client.setCredentials({ refresh_token: env.refreshToken });
  return client;
}

export function buildCalendarApi(
  auth: OAuth2Client,
): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth });
}

export async function findOrCreateCalendar(
  api: calendar_v3.Calendar,
  name: string,
  timeZone: string,
): Promise<string> {
  const list = await api.calendarList.list({ maxResults: 250 });
  const existing = list.data.items?.find((c) => c.summary === name);
  if (existing?.id) return existing.id;

  const created = await api.calendars.insert({
    requestBody: { summary: name, timeZone },
  });
  if (!created.data.id) {
    throw new Error(`Failed to create calendar "${name}"`);
  }
  return created.data.id;
}
