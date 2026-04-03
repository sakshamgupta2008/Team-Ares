import express from "express";
import cors from "cors";
import { maharashtraDistrictData } from "./data.js";
import { calculateRisk } from "./risk.js";

const app = express();
const PORT = 5000;

// ✅ CORS — allow all origins (fine for dev/hackathon)
app.use(cors({ origin: "*" }));
app.use(express.json());

// ──────────────────────────────────────────────
// GET /districts — returns all enriched district data
// ──────────────────────────────────────────────
app.get("/districts", (req, res) => {
  const enrichedData = maharashtraDistrictData.map((item) => {
    const { gap, score, level, trend } = calculateRisk(
      item.expected_check_percent,
      item.actual_check_percent
    );

    return {
      district: item.district,
      expected: item.expected_check_percent,
      actual: item.actual_check_percent,
      gap,
      score,
      risk: level,
      trend,
    };
  });

  res.json(enrichedData);
});

// ──────────────────────────────────────────────
// GET /summary — aggregate stats for dashboard header
// ──────────────────────────────────────────────
app.get("/summary", (req, res) => {
  const enrichedData = maharashtraDistrictData.map((item) => {
    const { gap, score, level } = calculateRisk(
      item.expected_check_percent,
      item.actual_check_percent
    );
    return { ...item, gap, score, risk: level };
  });

  const total = enrichedData.length;
  const high = enrichedData.filter((d) => d.risk === "high").length;
  const medium = enrichedData.filter((d) => d.risk === "medium").length;
  const low = enrichedData.filter((d) => d.risk === "low").length;
  const avgGap =
    enrichedData.reduce((sum, d) => sum + d.gap, 0) / total;

  const worstDistrict = enrichedData.sort((a, b) => b.gap - a.gap)[0];

  res.json({
    total,
    high,
    medium,
    low,
    avgGap: avgGap.toFixed(1),
    worstDistrict: worstDistrict.district,
    worstGap: worstDistrict.gap,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running → http://localhost:${PORT}`);
  console.log(`   /districts  — full district data`);
  console.log(`   /summary    — aggregate stats`);
});
