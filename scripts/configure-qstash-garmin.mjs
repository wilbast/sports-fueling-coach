import { Client } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN?.trim();
const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
if (!token || !baseUrl) {
  throw new Error("QSTASH_TOKEN und APP_URL müssen gesetzt sein.");
}

const client = new Client({ token });
const result = await client.schedules.create({
  destination: `${baseUrl}/api/internal/garmin/scheduler`,
  scheduleId: "sports-fueling-coach-garmin-hourly",
  cron: "0 * * * *",
  method: "POST",
  body: JSON.stringify({ source: "qstash-schedule" }),
  headers: { "Content-Type": "application/json" },
  retries: 3,
  retryDelay: "max(30000, pow(2, retried) * 30000)",
  timeout: 30,
  label: "garmin-scheduler"
});

console.log(`Garmin-QStash-Schedule aktiv: ${result.scheduleId}`);

