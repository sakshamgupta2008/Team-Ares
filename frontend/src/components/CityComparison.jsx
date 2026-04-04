import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid
} from "recharts";
import { C, RISK_COLOR, pctToSolidColor } from "../utils/constants.js";

const CityComparison = ({ onBack }) => {
  const [allDistricts, setAllDistricts] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/districts")
      .then(res => res.json())
      .then(data => {
        // Filter for the three required states
        const filtered = data.filter(d => 
          ["maharashtra", "karnataka", "madhya pradesh"].includes(d.state.toLowerCase())
        );
        setAllDistricts(filtered);
      })
      .catch(err => console.error("Error fetching districts:", err));
  }, []);

  const handleCitySelect = (districtName) => {
    if (selectedCities.includes(districtName)) {
      setSelectedCities(selectedCities.filter(c => c !== districtName));
    } else if (selectedCities.length < 3) {
      setSelectedCities([...selectedCities, districtName]);
    }
  };

  useEffect(() => {
    if (selectedCities.length >= 2) {
      setLoading(true);
      const query = selectedCities.join(",");
      fetch(`http://localhost:5000/compare?districts=${query}`)
        .then(res => res.json())
        .then(data => {
          setComparisonData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching comparison data:", err);
          setLoading(false);
        });
    } else {
      setComparisonData([]);
    }
  }, [selectedCities]);

  const getDiseaseComparisonData = (diseaseKey) => {
    if (!comparisonData.length) return [];
    
    // We'll compare the latest 'actual' value from history
    return comparisonData.map(city => ({
      name: city.district,
      value: city.diseases[diseaseKey].history[city.diseases[diseaseKey].history.length - 1].actual,
      expected: city.diseases[diseaseKey].history[city.diseases[diseaseKey].history.length - 1].expected,
    }));
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <button onClick={onBack} style={S.backBtn}>← BACK TO DASHBOARD</button>
        <h2 style={S.title}>CITY COMPARISON <span style={{ color: C.cyan }}>ANALYTICS</span></h2>
      </header>

      <main style={S.main}>
        {/* Selection Sidebar */}
        <div style={S.sidebar}>
          <h3 style={S.sidebarTitle}>SELECT CITIES (2-3)</h3>
          <div style={S.cityList}>
            {["Maharashtra", "Karnataka", "Madhya Pradesh"].map(state => (
              <div key={state} style={S.stateGroup}>
                <div style={S.stateLabel}>{state.toUpperCase()}</div>
                {allDistricts
                  .filter(d => d.state === state)
                  .map(d => (
                    <div
                      key={d.district}
                      onClick={() => handleCitySelect(d.district)}
                      style={{
                        ...S.cityItem,
                        color: selectedCities.includes(d.district) ? C.cyan : C.dim,
                        background: selectedCities.includes(d.district) ? "rgba(0,245,255,0.1)" : "transparent",
                        borderColor: selectedCities.includes(d.district) ? C.cyan : "transparent",
                      }}
                    >
                      {d.district}
                      {selectedCities.includes(d.district) && <span style={{ marginLeft: "auto" }}>✓</span>}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Content */}
        <div style={S.content}>
          {selectedCities.length < 2 ? (
            <div style={S.placeholder}>
              <div style={S.placeholderIcon}>⬡</div>
              <div style={S.placeholderText}>Select at least two cities to begin comparison</div>
            </div>
          ) : loading ? (
            <div style={S.placeholder}>
              <div style={S.loadingSpinner}></div>
              <div style={S.placeholderText}>Analyzing Data...</div>
            </div>
          ) : (
            <div style={S.chartsGrid}>
              {/* Summary Cards */}
              <div style={S.summaryRow}>
                {comparisonData.map(city => (
                  <div key={city.district} style={S.cityCard}>
                    <div style={S.cityCardHeader}>
                      <div style={S.cityName}>{city.district}</div>
                      <div style={S.cityState}>{city.state}</div>
                    </div>
                    <div style={S.cityStats}>
                      <div style={S.statItem}>
                        <div style={S.statLabel}>OVERALL RISK</div>
                        <div style={{ ...S.statValue, color: RISK_COLOR[city.level] }}>{city.level.toUpperCase()}</div>
                      </div>
                      <div style={S.statItem}>
                        <div style={S.statLabel}>GAP SCORE</div>
                        <div style={S.statValue}>{city.score}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Charts */}
              <div style={S.chartContainer}>
                <h4 style={S.chartTitle}>DIABETES SCREENING — ACTUAL VS EXPECTED</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getDiseaseComparisonData("diabetes")}>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                    <YAxis stroke={C.dim} fontSize={10} />
                    <Tooltip 
                      contentStyle={{ background: C.card, border: `1px solid ${C.nano}` }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar name="Actual %" dataKey="value" fill={C.red} radius={[4, 4, 0, 0]} />
                    <Bar name="Expected %" dataKey="expected" fill={C.dim} radius={[4, 4, 0, 0]} opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={S.chartContainer}>
                <h4 style={S.chartTitle}>HYPERTENSION CHECK — ACTUAL VS EXPECTED</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getDiseaseComparisonData("bp")}>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                    <YAxis stroke={C.dim} fontSize={10} />
                    <Tooltip 
                      contentStyle={{ background: C.card, border: `1px solid ${C.nano}` }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar name="Actual %" dataKey="value" fill={C.amber} radius={[4, 4, 0, 0]} />
                    <Bar name="Expected %" dataKey="expected" fill={C.dim} radius={[4, 4, 0, 0]} opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={S.chartContainer}>
                <h4 style={S.chartTitle}>OBESITY SCREENING — ACTUAL VS EXPECTED</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getDiseaseComparisonData("obesity")}>
                    <XAxis dataKey="name" stroke={C.dim} fontSize={10} />
                    <YAxis stroke={C.dim} fontSize={10} />
                    <Tooltip 
                      contentStyle={{ background: C.card, border: `1px solid ${C.nano}` }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar name="Actual %" dataKey="value" fill={C.purple} radius={[4, 4, 0, 0]} />
                    <Bar name="Expected %" dataKey="expected" fill={C.dim} radius={[4, 4, 0, 0]} opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const S = {
  root: {
    height: "100vh", width: "100vw", background: "#000",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "'Syne', sans-serif", color: "#fff",
  },
  header: {
    display: "flex", alignItems: "center",
    padding: "15px 22px", gap: 20,
    borderBottom: "1px solid #07111f",
    background: "linear-gradient(to right, #000, #030609, #000)",
  },
  backBtn: {
    background: "transparent", border: "1px solid #1a3a5c",
    borderRadius: 8, padding: "8px 16px",
    color: "#4a7090", fontSize: 10, fontWeight: 700,
    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
  },
  title: {
    fontSize: 18, fontWeight: 800, color: "#e8f4ff",
    letterSpacing: "0.08em", margin: 0,
  },
  main: {
    flex: 1, display: "flex", overflow: "hidden",
  },
  sidebar: {
    width: 280, borderRight: "1px solid #07111f",
    display: "flex", flexDirection: "column", background: "#030609",
  },
  sidebarTitle: {
    padding: "20px", fontSize: 12, fontWeight: 800, color: C.dim,
    letterSpacing: "0.1em", borderBottom: "1px solid #07111f", margin: 0,
  },
  cityList: {
    flex: 1, overflowY: "auto", padding: "10px",
  },
  stateGroup: {
    marginBottom: 20,
  },
  stateLabel: {
    fontSize: 9, fontWeight: 800, color: C.nano,
    padding: "5px 10px", letterSpacing: "0.1em",
  },
  cityItem: {
    padding: "8px 12px", fontSize: 11, cursor: "pointer",
    borderRadius: 6, marginBottom: 2, display: "flex", alignItems: "center",
    border: "1px solid transparent", transition: "all 0.2s",
  },
  content: {
    flex: 1, overflowY: "auto", padding: 30, background: "#000",
  },
  placeholder: {
    height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 20,
    opacity: 0.5,
  },
  placeholderIcon: {
    fontSize: 60, color: C.cyan, animation: "glowPulse 3s ease infinite",
  },
  placeholderText: {
    fontSize: 12, color: C.dim, letterSpacing: "0.1em",
  },
  loadingSpinner: {
    width: 40, height: 40, border: `2px solid ${C.cyan}22`,
    borderTopColor: C.cyan, borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  chartsGrid: {
    display: "grid", gridTemplateColumns: "1fr", gap: 30,
    maxWidth: 1200, margin: "0 auto",
  },
  summaryRow: {
    display: "flex", gap: 20,
  },
  cityCard: {
    flex: 1, background: C.card, border: "1px solid #0d2035",
    borderRadius: 12, padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  cityCardHeader: {
    borderBottom: "1px solid #1a3a5c", paddingBottom: 12, marginBottom: 15,
  },
  cityName: {
    fontSize: 18, fontWeight: 800, color: "#fff",
  },
  cityState: {
    fontSize: 10, color: C.dim, marginTop: 4, letterSpacing: "0.05em",
  },
  cityStats: {
    display: "flex", gap: 20,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9, color: C.nano, letterSpacing: "0.08em", marginBottom: 4,
  },
  statValue: {
    fontSize: 16, fontWeight: 800, color: C.cyan, fontFamily: "'JetBrains Mono',monospace",
  },
  chartContainer: {
    background: C.card, border: "1px solid #0d2035",
    borderRadius: 12, padding: 25,
  },
  chartTitle: {
    fontSize: 11, fontWeight: 800, color: C.dim,
    letterSpacing: "0.12em", marginBottom: 20, marginTop: 0,
  },
};

export default CityComparison;
