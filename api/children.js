import express from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "./middleware.js";
import { calculateDistance } from "../utils/geo.js";

const router = express.Router();

let activeChildId = null; // Global active child for the USB tracker

/* -----------------------------
   API: Get active child (for Serial Bridge)
----------------------------- */
router.get("/get-active", (req, res) => {
  res.json({ child_id: activeChildId });
});

// All other routes below are protected
router.use(isAuthenticated);

/* -----------------------------
   API: Set active child for tracking
----------------------------- */
router.post("/set-active", (req, res) => {
  const { child_id } = req.body;
  if (!child_id) return res.status(400).json({ message: "child_id required" });

  activeChildId = child_id;
  console.log(`[System] Active tracking target set to Child ID: ${activeChildId}`);
  res.json({ message: "Active tracking child updated", activeChildId });
});

/* -----------------------------
   API: Register new child
----------------------------- */
router.post("/register", (req, res) => {
  const parent = req.session.parent;

  const { firstname, lastname, child_age, child_gender } = req.body;

  if (!firstname || !lastname || !child_age || !child_gender) {
    return res.status(400).json({ message: "All child fields required" });
  }

  const age = parseInt(child_age);
  if (isNaN(age) || age < 1 || age > 18) {
    return res.status(400).json({ message: "Child age must be between 1 and 18" });
  }

  const sql = `
    INSERT INTO registered_children (
      firstname, lastname, child_age, child_gender,
      parent_id, parent_name, parent_email, parent_number, parent_home_address, date_registered
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const parent_name = `${parent.firstname} ${parent.lastname}`;
  const values = [
    firstname,
    lastname,
    child_age,
    child_gender,
    parent.id,
    parent_name,
    parent.email,
    parent.phone_number,
    parent.home_address,
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Error registering child:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Child registered successfully" });
  });
});

// -----------------------------
// API: Delete child and related records
// -----------------------------
router.post("/delete", (req, res) => {
  const parent = req.session.parent;
  const { child_id } = req.body;
  if (!child_id) return res.status(400).json({ message: "child_id required" });

  db.query("SELECT id FROM registered_children WHERE id = ? AND parent_id = ?", [child_id, parent.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Child not found or not permitted" });

    db.query("DELETE FROM locations WHERE child_id = ?", [child_id], (err) => {
      if (err) return res.status(500).json({ error: "Failed to delete locations" });

      db.query("DELETE FROM geofences WHERE child_id = ?", [child_id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to delete geofences" });

        db.query("DELETE FROM registered_children WHERE id = ?", [child_id], (err) => {
          if (err) return res.status(500).json({ error: "Failed to delete child" });
          res.json({ message: "Child and related records deleted" });
        });
      });
    });
  });
});

/* --------- --------------------------------
   API children with last location, geofence status
----------------------------------------- */
router.get("/list/all", (req, res) => {
  const parent = req.session.parent;

  const sql = `
    SELECT
      c.id,
      c.firstname,
      c.lastname,
      c.child_age,
      c.child_gender,
      c.date_registered,

      -- Last location
      l.latitude,
      l.longitude,
      l.readable_address,
      l.date_time AS last_seen,

      -- Geofence
      g.id AS geofence_id,
      g.latitude AS fence_lat,
      g.longitude AS fence_lng,
      g.radius
    FROM registered_children AS c
    LEFT JOIN (
      SELECT child_id, latitude, longitude, readable_address, date_time
      FROM locations
      WHERE (child_id, date_time) IN (
        SELECT child_id, MAX(date_time)
        FROM locations
        GROUP BY child_id
      )
    ) AS l ON c.id = l.child_id
    LEFT JOIN geofences AS g ON c.id = g.child_id
    WHERE c.parent_id = ?
    ORDER BY c.date_registered DESC
  `;

  db.query(sql, [parent.id], (err, results) => {
    if (err) {
      console.error("Error fetching manage children data:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Compute geofence status
    const processed = results.map(row => {
      let status = "none";

      if (row.fence_lat && row.latitude) {
        const distance = calculateDistance(
          row.fence_lat,
          row.fence_lng,
          row.latitude,
          row.longitude
        );

        status = distance <= row.radius ? "inside" : "outside";
      }

      return { ...row, geofence_status: status };
    });

    res.json(processed);
  });
});


export default router;
