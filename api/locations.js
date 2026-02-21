
import express from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "./middleware.js";

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
  const { child_id, latitude, longitude, readable_address } = req.body;

  if (!child_id || !latitude || !longitude)
    return res.status(400).json({ message: "Missing fields" });

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
        res.json({ message: "Updated existing record timestamp" });
      });
    } else {
      const insertSql = `
        INSERT INTO locations (child_id, latitude, longitude, readable_address, date_time)
        VALUES (?, ?, ?, ?, NOW())
      `;
      db.query(insertSql, [child_id, latitude, longitude, readable_address], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "New location saved" });
      });
    }
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
