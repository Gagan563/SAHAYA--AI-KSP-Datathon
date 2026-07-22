/**
 * SAHAYA AI — Catalyst Data Store Bulk Uploader
 *
 * Reads generated JSON data from data/samples/ and inserts rows into
 * Catalyst Data Store tables via the REST API.
 *
 * Prerequisites:
 *   1. Create tables on https://console.catalyst.zoho.com per schemas.sql
 *   2. Set environment variables:
 *        CATALYST_PROJECT_ID   — Your Catalyst project ID
 *        CATALYST_ACCESS_TOKEN — OAuth token (from catalyst login or API console)
 *        CATALYST_DOMAIN       — e.g. "https://sahaya-ai-XXXXX.zohocloud.com"
 *
 * Usage:
 *   node scripts/upload-to-catalyst.js
 *
 * Rate limits: Catalyst allows ~60 requests/min on free tier.
 * This script batches inserts and adds delays to stay under limits.
 */

const fs = require("fs");
const path = require("path");

// ── Configuration ───────────────────────────────────────

const PROJECT_ID = process.env.CATALYST_PROJECT_ID || "";
const ACCESS_TOKEN = process.env.CATALYST_ACCESS_TOKEN || "";
const DOMAIN = process.env.CATALYST_DOMAIN || "";

if (!PROJECT_ID || !ACCESS_TOKEN || !DOMAIN) {
  console.error("❌ Missing environment variables. Set:");
  console.error("   CATALYST_PROJECT_ID, CATALYST_ACCESS_TOKEN, CATALYST_DOMAIN");
  console.error("\nExample:");
  console.error('   $env:CATALYST_PROJECT_ID = "12345678"');
  console.error('   $env:CATALYST_ACCESS_TOKEN = "Zoho-oauthtoken ..."');
  console.error('   $env:CATALYST_DOMAIN = "https://sahaya-ai-XXXXX.zohocloud.com"');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data", "samples");
const BATCH_SIZE = 50; // Catalyst supports up to 200 rows per bulk insert
const DELAY_MS = 1200; // Delay between batches to stay under rate limit

// ── Table Mapping ───────────────────────────────────────
// Maps JSON filenames to Catalyst Data Store table names.
// Column names must match exactly what you created on the console.

const TABLE_MAP = [
  { file: "suspects.json",              table: "Suspects" },
  { file: "fir_records.json",           table: "FIR_Records" },
  { file: "fir_suspect_mapping.json",   table: "FIR_Suspect_Mapping" },
  { file: "victims.json",              table: "Victims" },
  { file: "fir_victim_mapping.json",    table: "FIR_Victim_Mapping" },
  { file: "case_narratives.json",       table: "Case_Narratives" },
  { file: "hotspot_answers.json",       table: "Hotspot_Answers" },
  { file: "monthly_hotspots.json",      table: "Monthly_Hotspots" },
  { file: "suspects_scored.json",       table: "Suspects_Scored",    optional: true },
  { file: "suspect_clusters.json",      table: "Suspect_Clusters",   optional: true },
];

// ── Helpers ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Insert a batch of rows into a Catalyst Data Store table.
 * Uses the Catalyst REST API bulk insert endpoint.
 */
async function insertBatch(tableName, rows) {
  const url = `${DOMAIN}/baas/v1/project/${PROJECT_ID}/table/${tableName}/row`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${res.status} inserting into ${tableName}: ${errorText}`);
  }

  return res.json();
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log("=" .repeat(60));
  console.log("🚀 SAHAYA AI — Catalyst Data Upload");
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Domain:  ${DOMAIN}`);
  console.log("=" .repeat(60));

  let totalRows = 0;
  let totalTables = 0;

  for (const { file, table, optional } of TABLE_MAP) {
    const filePath = path.join(DATA_DIR, file);

    if (!fs.existsSync(filePath)) {
      if (optional) {
        console.log(`\n⏭️  Skipping ${file} (optional, not found — run batch pipeline first)`);
        continue;
      }
      console.error(`\n❌ Required file not found: ${filePath}`);
      console.error("   Run: cd data/generator && node generate-data.js");
      process.exit(1);
    }

    const rows = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`\n📤 Uploading ${file} → ${table} (${rows.length} rows)`);

    const batches = chunk(rows, BATCH_SIZE);
    let uploaded = 0;

    for (let i = 0; i < batches.length; i++) {
      try {
        await insertBatch(table, batches[i]);
        uploaded += batches[i].length;
        process.stdout.write(`   ✅ Batch ${i + 1}/${batches.length} (${uploaded}/${rows.length})\r`);
      } catch (err) {
        console.error(`\n   ❌ Error in batch ${i + 1}: ${err.message}`);
        console.error("   Stopping upload for this table. Fix the error and retry.");
        break;
      }

      // Rate limit delay between batches
      if (i < batches.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`   ✅ ${table}: ${uploaded}/${rows.length} rows uploaded`);
    totalRows += uploaded;
    totalTables++;
  }

  console.log("\n" + "=" .repeat(60));
  console.log(`✅ Upload complete: ${totalRows} rows across ${totalTables} tables`);
  console.log("=" .repeat(60));
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
