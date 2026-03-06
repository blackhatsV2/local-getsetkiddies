
import express from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "./middleware.js";
import { calculateDistance } from "../utils/geo.js";

const router = express.Router();

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
router.post("/", (req, res) => {
  const { child_id, latitude, longitude, readable_address = "Fetching..." } = req.body;

  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

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
          res.json({ message: "Updated existing record timestamp", alert });
        });
      } else {
        const insertSql = `
          INSERT INTO locations (child_id, latitude, longitude, readable_address, date_time)
          VALUES (?, ?, ?, ?, NOW())
        `;
        db.query(insertSql, [child_id, latitude, longitude, readable_address], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: "New location saved", alert });
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
