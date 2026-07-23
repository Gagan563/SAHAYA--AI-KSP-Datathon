/**
 * SAHAYA AI — Unified Data Loader
 *
 * Abstracts data access: tries Catalyst Data Store SDK first,
 * falls back to local JSON files for development.
 *
 * Usage:
 *   const loader = require("./data-loader");
 *   const hotspots = await loader.getHotspots(req);  // req needed for Catalyst SDK init
 */

const fs = require("fs");
const path = require("path");

const DATA_DIRS = [
  path.join(__dirname, "data"),
  path.join(__dirname, "../../data/samples"),
];

// Cache for local JSON data (loaded once)
const _cache = {};

/**
 * Try to initialize Catalyst SDK from the request context.
 * Returns null if SDK is not available (local dev mode).
 */
function getCatalystApp(req) {
  try {
    const catalyst = require("zcatalyst-sdk-node");
    return catalyst.initialize(req);
  } catch (e) {
    return null;
  }
}

/**
 * Load data from a Catalyst Data Store table.
 * Handles pagination to fetch all rows.
 */
async function loadFromCatalyst(app, tableName) {
  const datastore = app.datastore();
  const table = datastore.table(tableName);

  // Catalyst returns max 200 rows per page
  let allRows = [];
  let hasMore = true;
  let nextToken = undefined;

  while (hasMore) {
    const options = { maxRows: 200 };
    if (nextToken) options.nextToken = nextToken;

    const response = await table.getPagedRows(options);
    if (response && response.data) {
      allRows = allRows.concat(response.data);
      nextToken = response.next_token;
      hasMore = !!nextToken;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

/**
 * Load data from a local JSON file (development fallback).
 */
function loadFromFile(filename) {
  if (_cache[filename]) return _cache[filename];

  const filePath = DATA_DIRS.map((dir) => path.join(dir, filename)).find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!filePath) {
    console.warn(`[DataLoader] File not found in any data directory: ${filename}`);
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    _cache[filename] = data;
    return data;
  } catch (e) {
    console.error(`[DataLoader] Error reading ${filename}:`, e.message);
    return [];
  }
}

/**
 * Normalize field names: the pipeline outputs `case_count` but some
 * handlers reference `count`. Add both for backward compatibility.
 */
function normalizeHotspots(data) {
  return data.map((row) => ({
    ...row,
    count: row.case_count ?? row.count ?? 0,
    case_count: row.case_count ?? row.count ?? 0,
  }));
}

function parseJSONField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function normalizeNarratives(data) {
  return data.map((row) => ({
    ...row,
    suspects_linked: parseJSONField(row.suspects_linked, []),
  }));
}

function normalizeClusters(data) {
  return data.map((row) => ({
    ...row,
    suspect_ids: parseJSONField(row.suspect_ids, []),
    fir_ids: parseJSONField(row.fir_ids, []),
    districts: parseJSONField(row.districts, []),
  }));
}

// ── Public API ──

/**
 * Get hotspot data (district/category aggregates).
 * @param {object} req - Express request (for Catalyst SDK init)
 */
async function getHotspots(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      const rows = await loadFromCatalyst(app, "Hotspot_Answers");
      console.log(`[DataLoader] Loaded ${rows.length} hotspots from Catalyst`);
      return normalizeHotspots(rows);
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for hotspots: ${e.message}`);
    }
  }
  return normalizeHotspots(loadFromFile("hotspot_answers.json"));
}

/**
 * Get monthly hotspot data (time-series breakdown).
 */
async function getMonthlyHotspots(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      const rows = await loadFromCatalyst(app, "Monthly_Hotspots");
      return normalizeHotspots(rows);
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for monthly: ${e.message}`);
    }
  }
  return normalizeHotspots(loadFromFile("monthly_hotspots.json"));
}

/**
 * Get suspect profiles.
 */
async function getSuspects(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      return await loadFromCatalyst(app, "Suspects");
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for suspects: ${e.message}`);
    }
  }
  return loadFromFile("suspects.json");
}

/**
 * Get FIR records.
 */
async function getFIRRecords(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      return await loadFromCatalyst(app, "FIR_Records");
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for FIRs: ${e.message}`);
    }
  }
  return loadFromFile("fir_records.json");
}

/**
 * Get FIR-Suspect mappings.
 */
async function getMappings(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      return await loadFromCatalyst(app, "FIR_Suspect_Mapping");
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for mappings: ${e.message}`);
    }
  }
  return loadFromFile("fir_suspect_mapping.json");
}

/**
 * Get case narratives.
 */
async function getNarratives(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      return normalizeNarratives(await loadFromCatalyst(app, "Case_Narratives"));
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for narratives: ${e.message}`);
    }
  }
  return normalizeNarratives(loadFromFile("case_narratives.json"));
}

/**
 * Get prebuilt graph data (nodes + links).
 * This is always from JSON since it's a pipeline artifact.
 */
function getGraphData() {
  return loadFromFile("graph_data.json");
}

/**
 * Get suspect clusters.
 */
async function getClusters(req) {
  const app = getCatalystApp(req);
  if (app) {
    try {
      return normalizeClusters(await loadFromCatalyst(app, "Suspect_Clusters"));
    } catch (e) {
      console.warn(`[DataLoader] Catalyst fallback for clusters: ${e.message}`);
    }
  }
  // Try computed file first, then samples
  const computed = normalizeClusters(loadFromFile("suspect_clusters.json"));
  return computed.length > 0 ? computed : [];
}

/**
 * Clear cached data (useful for testing).
 */
function clearCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}

module.exports = {
  getHotspots,
  getMonthlyHotspots,
  getSuspects,
  getFIRRecords,
  getMappings,
  getNarratives,
  getGraphData,
  getClusters,
  clearCache,
};
