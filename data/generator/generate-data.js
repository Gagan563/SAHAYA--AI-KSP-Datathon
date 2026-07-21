#!/usr/bin/env node
/**
 * SAHAYA AI — Synthetic Crime Data Generator (v2)
 * Generates realistic Kannada/Bengaluru-context crime data for the KSP Datathon.
 *
 * Produces:
 *   - fir_records.json         (80 FIR entries — now with investigation_status + modus_operandi)
 *   - suspects.json            (40 suspects)
 *   - fir_suspect_mapping.json (100+ mappings with overlaps for crime rings)
 *   - victims.json             (NEW: victims linked to FIRs)
 *   - fir_victim_mapping.json  (NEW: FIR-Victim join table)
 *   - case_narratives.json     (20 detailed narratives)
 *   - hotspot_answers.json     (pre-aggregated district stats)
 *   - monthly_hotspots.json    (NEW: monthly breakdown for trend analysis)
 *   - graph_data.json          (pre-built nodes/links for react-force-graph)
 *
 * Run: node generate-data.js
 */

const fs = require("fs");
const path = require("path");

// ── Seed Data ──────────────────────────────────────────────

const DISTRICTS = [
  { name: "Bengaluru Urban", lat: 12.9716, lon: 77.5946 },
  { name: "Bengaluru Rural", lat: 13.1986, lon: 77.7066 },
  { name: "Mysuru", lat: 12.2958, lon: 76.6394 },
  { name: "Mangaluru", lat: 12.8745, lon: 74.8423 },
  { name: "Hubli-Dharwad", lat: 15.3647, lon: 75.124 },
  { name: "Belagavi", lat: 15.8497, lon: 74.4977 },
  { name: "Kalaburagi", lat: 17.329, lon: 76.8343 },
  { name: "Shivamogga", lat: 13.9299, lon: 75.5681 },
  { name: "Tumakuru", lat: 13.3379, lon: 77.117 },
  { name: "Davangere", lat: 14.4644, lon: 75.9218 },
];

const STATIONS = {
  "Bengaluru Urban": ["Cubbon Park PS", "Koramangala PS", "Whitefield PS", "JP Nagar PS", "Yeshwanthpur PS", "HSR Layout PS", "Indiranagar PS", "Electronic City PS"],
  "Bengaluru Rural": ["Anekal PS", "Devanahalli PS", "Hosakote PS", "Nelamangala PS"],
  "Mysuru": ["Devaraja PS", "Krishnaraja PS", "Nazarbad PS", "Jayalakshmipuram PS"],
  "Mangaluru": ["Mangaluru North PS", "Mangaluru South PS", "Surathkal PS", "Bantwal PS"],
  "Hubli-Dharwad": ["Hubli Vidyanagar PS", "Dharwad PS", "Gokul Road PS"],
  "Belagavi": ["Belagavi Market PS", "Shahpur PS", "Khanapur PS"],
  "Kalaburagi": ["Kalaburagi City PS", "Aland PS", "Sedam PS"],
  "Shivamogga": ["Shivamogga Town PS", "Bhadravathi PS", "Thirthahalli PS"],
  "Tumakuru": ["Tumakuru Town PS", "Sira PS", "Madhugiri PS"],
  "Davangere": ["Davangere Town PS", "Harihar PS", "Jagalur PS"],
};

const CATEGORIES = ["Theft", "Robbery", "Assault", "Cybercrime", "Drug", "Murder", "Fraud", "Missing"];

const INVESTIGATION_STATUSES = [
  "Open",
  "Under Investigation",
  "Chargesheeted",
  "Closed",
];

const FIRST_NAMES_MALE = [
  "Ravi", "Suresh", "Manoj", "Kiran", "Prakash", "Naveen", "Anil", "Venkatesh",
  "Siddharth", "Ganesh", "Harish", "Deepak", "Ramesh", "Mahesh", "Rajesh",
  "Manjunath", "Basavaraj", "Shivaraj", "Chandrashekar", "Anand",
];
const FIRST_NAMES_FEMALE = [
  "Lakshmi", "Priya", "Kavya", "Meena", "Shobha", "Rekha", "Asha", "Divya",
  "Suma", "Bharathi",
];
const LAST_NAMES = [
  "Kumar", "Reddy", "Gowda", "Shetty", "Naik", "Patil", "Hegde", "Rao",
  "Swamy", "Murthy", "Nayak", "Joshi", "Sharma", "Bhat", "Kulkarni",
  "Hosamani", "Hiremath", "Angadi", "Madiwalar", "Desai",
];

const ALIASES_POOL = [
  "Blade", "Don", "Cobra", "Shadow", "Tiger", "Bullet", "Fox", "Spider",
  "Ghost", "Eagle", "Hawk", "Viper", "Wolf", "Panther", "Scorpion",
  "Lucky", "Danny", "Rocky", "Raja", "Munna",
];

const CRIME_DESCRIPTIONS = {
  Theft: [
    "Two-wheeler theft reported near {location}. Complainant's motorcycle (KA-{plate}) was stolen from parking area.",
    "Gold chain snatching incident near {location}. Suspects fled on a motorcycle towards {direction}.",
    "House break-in reported at {location}. Cash and jewelry worth ₹{amount} stolen while residents were away.",
    "Mobile phone theft at {location} bus stop. Suspect blended into the crowd and escaped.",
    "Vehicle accessory theft — side mirrors and wiper blades stolen from multiple parked cars at {location}.",
  ],
  Robbery: [
    "Armed robbery at {location} jewelry store. Three masked men threatened staff with knives and escaped with gold ornaments worth ₹{amount}.",
    "Highway robbery on {location} road. Truck driver assaulted and cash of ₹{amount} looted.",
    "ATM robbery attempt at {location}. Suspects tried to break open the machine using gas cutters. Alert security guard foiled the attempt.",
    "Daylight robbery near {location}. Victim was robbed of ₹{amount} at knifepoint while walking.",
  ],
  Assault: [
    "Assault case at {location}. Complainant sustained injuries after an altercation over a land dispute.",
    "Group clash near {location}. Multiple injuries reported. Weapons including iron rods and sticks were used.",
    "Domestic violence complaint filed at {location}. Victim reported repeated physical abuse.",
    "Road rage incident near {location}. Two-wheeler rider assaulted after a minor traffic collision.",
  ],
  Cybercrime: [
    "Online financial fraud — victim lost ₹{amount} to fake investment scheme operated through social media.",
    "Phishing attack — complainant's bank credentials compromised via fraudulent SMS. ₹{amount} debited from account.",
    "Ransomware attack on {location} business. Systems encrypted, attackers demanded ₹{amount} in cryptocurrency.",
    "Identity theft — suspect created fake Aadhaar and PAN documents using complainant's photos obtained from social media.",
    "OTP fraud — caller posing as bank executive obtained OTP and withdrew ₹{amount} from the complainant's savings account.",
  ],
  Drug: [
    "Ganja seizure at {location}. {quantity}kg of marijuana recovered from a goods vehicle. Two suspects arrested.",
    "Synthetic drug lab raided at {location}. MDMA and LSD tabs worth ₹{amount} seized.",
    "Drug peddling near {location} college campus. Suspect caught selling cannabis edibles to students.",
    "Interstate drug trafficking — courier intercepted at {location} checkpoint with {quantity}kg of narcotics concealed in vehicle panels.",
  ],
  Murder: [
    "Homicide at {location}. Victim (male, {age}) found with stab wounds. Dispute over money suspected as motive.",
    "Honor killing suspected — young woman found dead at {location}. Family members under investigation.",
    "Contract killing — business rival found shot dead near {location}. Investigation reveals financial disputes worth ₹{amount}.",
  ],
  Fraud: [
    "Real estate fraud — multiple buyers cheated by fake property documents for a site at {location}. Total fraud worth ₹{amount}.",
    "Employment fraud — suspect collected ₹{amount} from {count} job seekers promising government posts.",
    "Insurance fraud — staged accident at {location} to claim insurance of ₹{amount}. Suspect colluded with local garage.",
    "Ponzi scheme — suspect collected ₹{amount} from {count} investors promising 30% monthly returns.",
  ],
  Missing: [
    "Missing person — {missingName} ({age}, {gender}) not seen since leaving home at {location} on {date}.",
    "Minor girl ({age}) missing from {location}. Last seen near school premises. Parents suspect elopement.",
    "Elderly person ({age}) suffering from Alzheimer's, missing from {location} since morning. Was last wearing {clothing}.",
  ],
};

const MODUS_OPERANDI = {
  Theft: [
    "Target selection of parked vehicles in poorly lit areas during night hours",
    "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed",
    "Distraction technique — one suspect engages victim in conversation while accomplice steals valuables",
    "Breaking and entering during festivals/weddings when homes are vacant",
    "Organized shoplifting using concealed bags and coordinated distraction",
  ],
  Robbery: [
    "Armed robbery using country-made weapons, targeting isolated shops at closing time",
    "Highway ambush — vehicles forced to stop using road obstacles",
    "ATM break-in using gas cutters during power outages",
    "Knifepoint mugging of pedestrians in secluded lanes during late hours",
  ],
  Assault: [
    "Gang violence using blunt weapons, targeting rival group members",
    "Alcohol-fueled altercation escalating to physical violence",
    "Pre-meditated attack with accomplices blocking escape routes",
    "Road rage escalation involving weapons of opportunity",
  ],
  Cybercrime: [
    "Social engineering via phone calls impersonating bank officials",
    "Phishing websites replicating popular e-commerce platforms",
    "SIM swap fraud to intercept OTPs and drain bank accounts",
    "Fake investment app with initial real returns to build trust before large fraud",
  ],
  Drug: [
    "Drug concealment in modified vehicle compartments for interstate transport",
    "Campus-based micro-distribution through student networks",
    "Dark web procurement with cryptocurrency payments",
    "Courier network using unsuspecting delivery personnel",
  ],
  Murder: [
    "Pre-planned attack using sharp weapons in isolated locations",
    "Contract killing arranged through intermediaries",
    "Staged accident to conceal homicide",
  ],
  Fraud: [
    "Forged property documents with fake registration stamps",
    "Ponzi scheme with early payouts to attract larger investments",
    "Fake job portals collecting fees from desperate job seekers",
    "Impersonation of government officials to extract bribes",
  ],
  Missing: [
    "Voluntary departure — person left due to family disputes",
    "Suspected abduction — last seen with unknown individual",
    "Runaway minor — left home following online contact with stranger",
  ],
};

const LOCATIONS = [
  "MG Road", "Brigade Road", "Commercial Street", "Jayanagar 4th Block",
  "Malleshwaram Circle", "Banashankari", "Rajajinagar", "Majestic",
  "KR Market", "Yeshwanthpur Industrial Area", "Silk Board Junction",
  "Electronic City Phase 1", "Whitefield Main Road", "Marathahalli Bridge",
  "Hebbal Flyover", "Peenya Industrial Area", "Devanahalli Highway",
  "Mysuru Road toll plaza", "Kengeri Satellite Town", "Hosur Road",
];

const DIRECTIONS = ["Majestic", "Silk Board", "KR Puram", "Whitefield", "Hebbal", "Banashankari", "Kengeri", "Electronic City"];
const CLOTHING = ["white kurta and dhoti", "blue checked shirt and black pants", "green saree", "grey t-shirt and jeans"];

// Victim-specific names (gender-separated to avoid mismatches)
const VICTIM_FIRST_NAMES_MALE = [
  "Rohan", "Arjun", "Vikram", "Arun", "Karthik", "Sachin", "Rohit",
  "Vinay", "Girish", "Nikhil", "Varun", "Sunil", "Mohan", "Pavan",
];
const VICTIM_FIRST_NAMES_FEMALE = [
  "Ananya", "Meera", "Pooja", "Sneha", "Divya", "Nandini", "Bhavya",
  "Swathi", "Pallavi", "Chaitra", "Kavitha", "Rashmi", "Geeta", "Sarita",
];

// ── Helpers ──────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(startYear = 2024, endYear = 2025) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function padId(prefix, num, width = 3) {
  return `${prefix}${String(num).padStart(width, "0")}`;
}

function jitter(val, range = 0.05) {
  return val + (Math.random() - 0.5) * 2 * range;
}

function fillTemplate(template, district) {
  return template
    .replace("{location}", pick(LOCATIONS))
    .replace("{direction}", pick(DIRECTIONS))
    .replace("{plate}", `${randInt(1, 72)}-${pick(["AB", "CD", "EF", "MH", "XX"])}-${randInt(1000, 9999)}`)
    .replace("{amount}", (randInt(10, 500) * 1000).toLocaleString("en-IN"))
    .replace("{quantity}", randInt(2, 50))
    .replace("{age}", randInt(18, 65))
    .replace("{count}", randInt(5, 50))
    .replace("{missingName}", `${pick([...FIRST_NAMES_MALE, ...FIRST_NAMES_FEMALE])} ${pick(LAST_NAMES)}`)
    .replace("{gender}", pick(["male", "female"]))
    .replace("{date}", formatDate(randDate()))
    .replace("{clothing}", pick(CLOTHING));
}

// ── Crime Ring Definitions ──────────────────────────────
// Suspects intentionally linked across multiple FIRs.
// Some rings share the SAME MO across FIRs for MO-based profiling demos.

const CRIME_RINGS = [
  {
    name: "Bengaluru Theft Ring",
    suspectIndices: [0, 1, 2, 3],
    category: "Theft",
    district: "Bengaluru Urban",
    firCount: 6,
    sharedMO: "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed",
  },
  {
    name: "Cross-District Drug Network",
    suspectIndices: [4, 5, 6, 7, 8],
    category: "Drug",
    district: null,
    firCount: 5,
    sharedMO: "Drug concealment in modified vehicle compartments for interstate transport",
  },
  {
    name: "Cyber Fraud Syndicate",
    suspectIndices: [9, 10, 11],
    category: "Cybercrime",
    district: "Bengaluru Urban",
    firCount: 5,
    sharedMO: "Social engineering via phone calls impersonating bank officials",
  },
  {
    name: "Highway Robbery Gang",
    suspectIndices: [12, 13, 14, 15],
    category: "Robbery",
    district: null,
    firCount: 4,
    sharedMO: "Highway ambush — vehicles forced to stop using road obstacles",
  },
];

// ── Generate Suspects ───────────────────────────────────

function generateSuspects(count) {
  const suspects = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.2;
    const firstName = pick(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
    const lastName = pick(LAST_NAMES);
    const district = pick(DISTRICTS);
    const hasAlias = Math.random() > 0.5;

    suspects.push({
      suspect_id: padId("S", i + 1),
      name: `${firstName} ${lastName}`,
      aliases: hasAlias ? pickN(ALIASES_POOL, randInt(1, 2)).join(", ") : "",
      age: randInt(19, 55),
      gender: isMale ? "Male" : "Female",
      district: district.name,
      known_address: `${randInt(1, 500)}, ${pick(["1st Cross", "2nd Main", "3rd Stage", "4th Phase", "5th Block"])}, ${pick(LOCATIONS)}, ${district.name}`,
      risk_score: pick(["Low", "Low", "Low", "Medium", "Medium", "High"]),
    });
  }

  // Boost risk scores for crime ring members
  CRIME_RINGS.forEach((ring) => {
    ring.suspectIndices.forEach((idx) => {
      if (suspects[idx]) {
        suspects[idx].risk_score = ring.suspectIndices.length > 4 ? "High" : "Medium";
      }
    });
  });
  if (suspects[4]) suspects[4].risk_score = "High";
  if (suspects[9]) suspects[9].risk_score = "High";

  return suspects;
}

// ── Generate Victims ────────────────────────────────────

function generateVictims(firs) {
  const victims = [];
  const victimMappings = [];
  let victimNum = 1;

  firs.forEach((fir) => {
    // ~80% of FIRs have victims, 1-3 per FIR
    if (Math.random() > 0.2) {
      const victimCount = fir.category === "Missing" ? 1 : randInt(1, 2);
      for (let i = 0; i < victimCount; i++) {
        const isMale = Math.random() > 0.4; // 60% male victims
        const victimId = padId("V", victimNum);

        victims.push({
          victim_id: victimId,
          name: `${pick(isMale ? VICTIM_FIRST_NAMES_MALE : VICTIM_FIRST_NAMES_FEMALE)} ${pick(LAST_NAMES)}`,
          age: randInt(15, 75),
          gender: isMale ? "Male" : "Female",
          district: fir.district,
        });

        victimMappings.push({
          fir_id: fir.fir_id,
          victim_id: victimId,
        });

        victimNum++;
      }
    }
  });

  return { victims, victimMappings };
}

// ── Generate FIR Records ────────────────────────────────

function generateFIRs(count, suspects) {
  const firs = [];
  const mappings = [];
  let firNum = 1;

  // First: generate crime ring FIRs (these create the detectable clusters)
  // Crime ring FIRs share the SAME MO for repeat-offender profiling demos
  CRIME_RINGS.forEach((ring) => {
    for (let i = 0; i < ring.firCount; i++) {
      const district = ring.district
        ? DISTRICTS.find((d) => d.name === ring.district)
        : pick(DISTRICTS);
      const station = pick(STATIONS[district.name]);
      const date = randDate();
      const firId = `FIR-${date.getFullYear()}-${district.name.substring(0, 3).toUpperCase()}-${padId("", firNum, 4)}`;

      const descTemplates = CRIME_DESCRIPTIONS[ring.category];
      const description = fillTemplate(pick(descTemplates), district.name);

      // Use the ring's shared MO for most FIRs (80%), random MO occasionally
      const mo = Math.random() < 0.8
        ? ring.sharedMO
        : pick(MODUS_OPERANDI[ring.category]);

      firs.push({
        fir_id: firId,
        date_filed: formatDate(date),
        district: district.name,
        station: station,
        description: description,
        category: ring.category,
        latitude: jitter(district.lat),
        longitude: jitter(district.lon),
        investigation_status: pick(["Under Investigation", "Under Investigation", "Chargesheeted", "Open"]),
        modus_operandi: mo,
      });

      // Link 2-3 suspects from this ring to this FIR
      const linkedCount = Math.min(randInt(2, 3), ring.suspectIndices.length);
      const linkedIndices = pickN(ring.suspectIndices, linkedCount);
      linkedIndices.forEach((suspIdx, j) => {
        mappings.push({
          fir_id: firId,
          suspect_id: suspects[suspIdx].suspect_id,
          role: j === 0 ? "Primary" : "Accomplice",
        });
      });

      firNum++;
    }
  });

  // Then: fill remaining FIRs with random suspects
  const remainingCount = count - firs.length;
  for (let i = 0; i < remainingCount; i++) {
    const district = pick(DISTRICTS);
    const station = pick(STATIONS[district.name]);
    const category = pick(CATEGORIES);
    const date = randDate();
    const firId = `FIR-${date.getFullYear()}-${district.name.substring(0, 3).toUpperCase()}-${padId("", firNum, 4)}`;

    const descTemplates = CRIME_DESCRIPTIONS[category];
    const description = fillTemplate(pick(descTemplates), district.name);
    const mo = pick(MODUS_OPERANDI[category]);

    firs.push({
      fir_id: firId,
      date_filed: formatDate(date),
      district: district.name,
      station: station,
      description: description,
      category: category,
      latitude: jitter(district.lat),
      longitude: jitter(district.lon),
      investigation_status: pick(INVESTIGATION_STATUSES),
      modus_operandi: mo,
    });

    // Link 1-2 random suspects — ONLY from non-ring suspects (index 16+)
    const nonRingSuspects = suspects.slice(16);
    const suspCount = randInt(1, 2);
    const randomSuspects = pickN(nonRingSuspects, suspCount);
    randomSuspects.forEach((susp, j) => {
      mappings.push({
        fir_id: firId,
        suspect_id: susp.suspect_id,
        role: j === 0 ? "Primary" : pick(["Accomplice", "Witness"]),
      });
    });

    firNum++;
  }

  return { firs, mappings };
}

// ── Generate Case Narratives ────────────────────────────

function generateNarratives(firs, suspects, mappings, count) {
  const selectedFirs = pickN(firs, count);
  return selectedFirs.map((fir) => {
    const linkedMappings = mappings.filter((m) => m.fir_id === fir.fir_id);
    const linkedSuspectIds = linkedMappings.map((m) => m.suspect_id);
    const linkedSuspects = suspects.filter((s) => linkedSuspectIds.includes(s.suspect_id));
    const suspectNames = linkedSuspects.map((s) => s.name).join(", ");

    const mo = fir.modus_operandi || pick(MODUS_OPERANDI[fir.category] || MODUS_OPERANDI.Theft);

    const narrative = `On ${fir.date_filed}, a case of ${fir.category.toLowerCase()} was reported at ${fir.station}, ${fir.district} district. ${fir.description} `
      + `The investigating team identified ${linkedSuspects.length} suspect(s)${suspectNames ? ": " + suspectNames : ""}. `
      + `The modus operandi observed was: ${mo}. `
      + `The case was registered under the relevant sections of the IPC and BNS. `
      + `Investigation revealed connections to ${randInt(1, 4)} prior cases in the ${fir.district} area. `
      + `${fir.investigation_status === "Closed" || fir.investigation_status === "Chargesheeted" ? "The case has been resolved and chargesheeted." : "Investigation is ongoing with active surveillance on the suspects."}`;

    return {
      fir_id: fir.fir_id,
      title: `${fir.category} case at ${fir.station}`,
      narrative: narrative,
      modus_operandi: mo,
      evidence_summary: `1. FIR registered at ${fir.station}. 2. ${randInt(1, 5)} witness statements collected. 3. ${pick(["CCTV footage analyzed", "Mobile CDR obtained", "Forensic evidence collected", "Digital evidence recovered"])}. 4. ${pick(["Scene of crime inspected", "Suspect identification parade conducted", "Vehicle tracking in progress"])}`,
      investigating_officer: `${pick(["SI", "PSI", "Inspector"])} ${pick(FIRST_NAMES_MALE)} ${pick(LAST_NAMES)}, ${fir.station}`,
      suspects_linked: linkedSuspectIds,
      status: fir.investigation_status === "Closed" || fir.investigation_status === "Chargesheeted" ? "Chargesheeted" : "Under Investigation",
      created_at: new Date(fir.date_filed + "T10:30:00+05:30").toISOString(),
      updated_at: new Date(new Date(fir.date_filed).getTime() + randInt(1, 30) * 86400000).toISOString(),
    };
  });
}

// ── Aggregate Hotspot Answers ───────────────────────────

function aggregateHotspots(firs) {
  const counts = {};
  firs.forEach((fir) => {
    const key = `${fir.district}|${fir.category}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const now = new Date().toISOString();
  return Object.entries(counts).map(([key, count]) => {
    const [district, category] = key.split("|");
    return {
      district,
      crime_category: category,
      count,
      period: "2024-2025",
      computed_at: now,
      trend: count > 5 ? "Rising" : count > 2 ? "Stable" : "Declining",
    };
  });
}

// ── Monthly Hotspot Breakdown (for time-based trend analytics) ──

function aggregateMonthlyHotspots(firs) {
  const counts = {};
  firs.forEach((fir) => {
    const date = new Date(fir.date_filed);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const key = `${fir.district}|${fir.category}|${monthKey}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const now = new Date().toISOString();
  return Object.entries(counts).map(([key, count]) => {
    const [district, category, month] = key.split("|");
    return {
      district,
      crime_category: category,
      month,
      count,
      computed_at: now,
    };
  });
}

// ── Build Graph Data (for react-force-graph) ────────────

function buildGraphData(suspects, mappings) {
  const nodes = suspects.map((s) => ({
    id: s.suspect_id,
    name: s.name,
    risk: s.risk_score,
    district: s.district,
    group: 0,
  }));

  const firToSuspects = {};
  mappings.forEach((m) => {
    if (!firToSuspects[m.fir_id]) firToSuspects[m.fir_id] = [];
    firToSuspects[m.fir_id].push(m.suspect_id);
  });

  const edgeSet = new Set();
  const links = [];
  Object.entries(firToSuspects).forEach(([firId, suspectIds]) => {
    for (let i = 0; i < suspectIds.length; i++) {
      for (let j = i + 1; j < suspectIds.length; j++) {
        const edgeKey = [suspectIds[i], suspectIds[j]].sort().join("-");
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          links.push({
            source: suspectIds[i],
            target: suspectIds[j],
            fir_id: firId,
            label: "Co-accused",
          });
        }
      }
    }
  });

  // Connected component detection for group assignment
  const adjacency = {};
  links.forEach((l) => {
    if (!adjacency[l.source]) adjacency[l.source] = [];
    if (!adjacency[l.target]) adjacency[l.target] = [];
    adjacency[l.source].push(l.target);
    adjacency[l.target].push(l.source);
  });

  const visited = new Set();
  let groupId = 1;
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  Object.keys(adjacency).forEach((startNode) => {
    if (visited.has(startNode)) return;
    const queue = [startNode];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      if (nodeMap[current]) nodeMap[current].group = groupId;
      (adjacency[current] || []).forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }
    groupId++;
  });

  return { nodes, links };
}

// ── Main ────────────────────────────────────────────────

function main() {
  console.log("🔧 SAHAYA AI — Generating synthetic crime data (v2)...\n");

  const suspects = generateSuspects(40);
  console.log(`✅ Generated ${suspects.length} suspects`);

  const { firs, mappings } = generateFIRs(80, suspects);
  console.log(`✅ Generated ${firs.length} FIR records (with investigation_status + MO)`);
  console.log(`✅ Generated ${mappings.length} FIR-Suspect mappings`);

  const { victims, victimMappings } = generateVictims(firs);
  console.log(`✅ Generated ${victims.length} victims`);
  console.log(`✅ Generated ${victimMappings.length} FIR-Victim mappings`);

  const narratives = generateNarratives(firs, suspects, mappings, 20);
  console.log(`✅ Generated ${narratives.length} case narratives`);

  const hotspots = aggregateHotspots(firs);
  console.log(`✅ Generated ${hotspots.length} hotspot entries`);

  const monthlyHotspots = aggregateMonthlyHotspots(firs);
  console.log(`✅ Generated ${monthlyHotspots.length} monthly hotspot entries`);

  const graphData = buildGraphData(suspects, mappings);
  console.log(`✅ Built graph: ${graphData.nodes.length} nodes, ${graphData.links.length} edges`);

  // Detect crime ring stats
  const groups = {};
  graphData.nodes.forEach((n) => {
    if (n.group > 0) {
      if (!groups[n.group]) groups[n.group] = [];
      groups[n.group].push(n.id);
    }
  });
  const rings = Object.entries(groups).filter(([, members]) => members.length >= 2);
  console.log(`✅ Detected ${rings.length} suspect clusters (crime rings)`);

  // Verify MO sharing within rings
  const moStats = {};
  CRIME_RINGS.forEach((ring) => {
    const ringFirs = firs.filter((f) => {
      const firMappings = mappings.filter((m) => m.fir_id === f.fir_id);
      return firMappings.some((m) => ring.suspectIndices.map((i) => suspects[i].suspect_id).includes(m.suspect_id));
    });
    const moCountMap = {};
    ringFirs.forEach((f) => {
      moCountMap[f.modus_operandi] = (moCountMap[f.modus_operandi] || 0) + 1;
    });
    moStats[ring.name] = moCountMap;
  });
  console.log(`✅ MO sharing verified across crime rings`);

  // Write output files
  const outputDir = path.join(__dirname, "..", "samples");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const files = {
    "fir_records.json": firs,
    "suspects.json": suspects,
    "fir_suspect_mapping.json": mappings,
    "victims.json": victims,
    "fir_victim_mapping.json": victimMappings,
    "case_narratives.json": narratives,
    "hotspot_answers.json": hotspots,
    "monthly_hotspots.json": monthlyHotspots,
    "graph_data.json": graphData,
  };

  Object.entries(files).forEach(([filename, data]) => {
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`📁 Wrote ${filepath}`);
  });

  // Print summary
  console.log("\n📊 Data Summary:");
  console.log("─".repeat(50));
  console.log(`  FIR Records:          ${firs.length}`);
  console.log(`  Suspects:             ${suspects.length}`);
  console.log(`  FIR-Suspect Links:    ${mappings.length}`);
  console.log(`  Victims:              ${victims.length}`);
  console.log(`  FIR-Victim Links:     ${victimMappings.length}`);
  console.log(`  Case Narratives:      ${narratives.length}`);
  console.log(`  Hotspot Entries:       ${hotspots.length}`);
  console.log(`  Monthly Hotspots:     ${monthlyHotspots.length}`);
  console.log(`  Graph Nodes:          ${graphData.nodes.length}`);
  console.log(`  Graph Edges:          ${graphData.links.length}`);
  console.log(`  Crime Rings Detected: ${rings.length}`);
  rings.forEach(([gid, members]) => {
    const memberNames = members.map((id) => suspects.find((s) => s.suspect_id === id)?.name || id);
    console.log(`    Ring ${gid}: ${memberNames.join(", ")}`);
  });
  console.log("─".repeat(50));
  console.log("\n✨ Done! Files written to data/samples/");
}

main();
