
import express from "express";
import fetch from "node-fetch";
import db from "../db/connection.js";
import { isAuthenticated } from "./middleware.js";
import { calculateDistance } from "../utils/geo.js";

const router = express.Router();

//cache for reverse geocoding
const geoCache = new Map();

/* -----------------------------
   API: Proxy Reverse Geocode
----------------------------- */
router.get("/reverse-geocode", isAuthenticated, async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing latitude or longitude" });
  }

  // Create a cache key 
  const cacheKey = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
  
  if (geoCache.has(cacheKey)) {
    console.log(`[GEO CACHE HIT] ${cacheKey}`);
    return res.json({ address: geoCache.get(cacheKey) });
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        'User-Agent': 'GetSetKiddies/1.0 (NodeJS Backend; contact: admin@getsetkiddies.local)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    const address = data.display_name || null;
    
    // Cache the successful result
    if (address) {
      geoCache.set(cacheKey, address);
    }

    res.json({ address });
  } catch (err) {
    console.error("Nominatim proxy error:", err);
    res.status(500).json({ error: "Geocoding failed" });
  }
});


/* -----------------------------
   API: Get last known location
----------------------------- */
router.get("/:child_id", isAuthenticated, (req, res) => {
  const { child_id } = req.params;
  const sql = `
    SELECT * FROM locations
    WHERE child_id = ?
    ORDER BY date_time DESC
    LIMIT 1
  `;
  db.query(sql, [child_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.json({ message: "no records yet" });
    res.json(results[0]);
  });
});

/* -----------------------------
   API: Save or update location
----------------------------- */
router.post("/", async (req, res) => {
  let { child_id, latitude, longitude, readable_address, source = "GSM" } = req.body;

  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

  if (!readable_address || readable_address === "Fetching..." || readable_address === "Unknown location") {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
        headers: {
          'User-Agent': 'GetSetKiddies/1.0 (NodeJS Backend)'
        }
      });
      const data = await response.json();
      readable_address = data.display_name || "Unknown location";
    } catch (err) {
      console.error("Nominatim fetch error:", err);
      readable_address = "Unknown location";
    }
  }

  // 1. Fetch the geofence for this child first
  const geofenceSql = "SELECT latitude, longitude, radius FROM geofences WHERE child_id = ?";

  db.query(geofenceSql, [child_id], (err, geofences) => {
    if (err) return res.status(500).json({ error: err.message });

    let alert = false;
    if (geofences.length > 0) {
      const fence = geofences[0];
      const distance = calculateDistance(latitude, longitude, fence.latitude, fence.longitude);
      if (distance > fence.radius) {
        alert = true;
      }
    }

    // 2. Save or update the location
    const checkSql = `
      SELECT id, readable_address FROM locations
      WHERE child_id = ?
      ORDER BY date_time DESC
      LIMIT 1
    `;

    db.query(checkSql, [child_id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0 && results[0].readable_address === readable_address) {
        const updateSql = `
          UPDATE locations SET date_time = NOW(), latitude = ?, longitude = ?
          WHERE id = ?
        `;
        db.query(updateSql, [latitude, longitude, results[0].id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: `Updated ${source} record timestamp`, alert });
        });
      } else {
        // Note: You should update your DB schema to include 'source' column for full effect
        const insertSql = `
          INSERT INTO locations (child_id, latitude, longitude, readable_address, date_time)
          VALUES (?, ?, ?, ?, NOW())
        `;
        db.query(insertSql, [child_id, latitude, longitude, readable_address], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: `New location saved via ${source}`, alert });
        });
      }
    });
  });
});

/* -----------------------------
   API: Get location history
----------------------------- */
router.get("/history/:child_id", isAuthenticated, (req, res) => {
  const { child_id } = req.params;
  const sql = `
    SELECT latitude, longitude, readable_address, date_time
    FROM locations
    WHERE child_id = ?
    ORDER BY date_time ASC
  `;
  db.query(sql, [child_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.json({ message: "no records yet" });
    res.json(results);
  });
});

export default router;
