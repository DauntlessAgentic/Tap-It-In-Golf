import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const SCOPE = "https://www.googleapis.com/auth/calendar";

async function main(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      "Missing one of: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env",
    );
    process.exit(1);
  }

  const redirect = new URL(redirectUri);
  const port = Number(redirect.port || (redirect.protocol === "https:" ? 443 : 80));
  const expectedPath = redirect.pathname;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SCOPE],
  });

  console.log("\nOpen this URL in a browser, approve, and you'll be redirected back:\n");
  console.log(authUrl);
  console.log("\nWaiting for the OAuth callback on", redirectUri, "...\n");

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) return;
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== expectedPath) {
          res.writeHead(404).end("not found");
          return;
        }
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400).end(`OAuth error: ${error}`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) {
          res.writeHead(400).end("missing ?code param");
          return;
        }

        const { tokens } = await oauth2.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          res
            .writeHead(500)
            .end(
              "No refresh_token returned. Revoke prior consent at https://myaccount.google.com/permissions and retry.",
            );
          server.close();
          reject(new Error("No refresh_token in response"));
          return;
        }

        res
          .writeHead(200, { "content-type": "text/plain" })
          .end("Refresh token received. You can close this tab.\n");

        console.log("\n✅ Refresh token acquired.\n");
        console.log("Add this line to your .env:\n");
        console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}\n`);

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500).end("error: " + (err as Error).message);
        server.close();
        reject(err);
      }
    });
    server.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
