
import express from "express";
import db from "../db/connection.js";
import { isAuthenticated } from "./middleware.js";

const router = express.Router();
router.use(isAuthenticated);

/* -----------------------------
   PAGE: Geofence Setup
----------------------------- */

router.get("/setup", (req, res) => {
  const parent = req.session.parent;
  const selectedChildId = req.query.child_id || null;

  const sql = `
    SELECT c.id, c.firstname, c.lastname, c.child_age, c.child_gender,
           l.latitude, l.longitude, l.date_time,
           g.id AS geofence_id, g.name AS geofence_name,
           g.created_at AS geofence_created_at, g.updated_at AS geofence_updated_at
    FROM registered_children AS c
    LEFT JOIN (
      SELECT child_id, latitude, longitude, date_time
      FROM locations
      WHERE (child_id, date_time) IN (
        SELECT child_id, MAX(date_time)
        FROM locations
        GROUP BY child_id
      )
    ) AS l ON c.id = l.child_id
    LEFT JOIN geofences AS g ON c.id = g.child_id
    WHERE c.parent_id = ?
  `;

  db.query(sql, [parent.id], (err, children) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }

    res.render("pages/geofence-setup", {
      title: "Get Set Kiddies",
      parent,
      children,
      selectedChildId,
    });
  });
});


/* -----------------------------
   API: Add or Replace Geofence
----------------------------- */
router.post("/add", (req, res) => {
  const { child_id, name, latitude, longitude, radius } = req.body;


  const checkSql = "SELECT id FROM geofences WHERE child_id = ?";
  db.query(checkSql, [child_id], (err, results) => {
    if (err) {
      console.error("Error checking existing geofence:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0) {

      const updateSql = `
        UPDATE geofences
        SET name = ?, latitude = ?, longitude = ?, radius = ?, updated_at = NOW()
        WHERE child_id = ?
      `;
      db.query(updateSql, [name, latitude, longitude, radius, child_id], (err2) => {
        if (err2) {
          console.error("Error updating geofence:", err2);
          return res.status(500).json({ error: "Failed to update geofence" });
        }
        res.json({ message: "Existing geofence replaced successfully" });
      });

    } else {

      const insertSql = `
        INSERT INTO geofences (child_id, name, latitude, longitude, radius, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      db.query(insertSql, [child_id, name, latitude, longitude, radius], (err3) => {
        if (err3) {
          console.error("Error adding geofence:", err3);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Geofence added successfully" });
      });
    }
  });
});


/* -----------------------------
   API: Get geofences for child
----------------------------- */
router.get("/:child_id", (req, res) => {
  const { child_id } = req.params;
  const sql = "SELECT * FROM geofences WHERE child_id = ?";
  db.query(sql, [child_id], (err, results) => {
    if (err) {
      console.error("Error fetching geofences:", err);
      return res.status(500).send("Database error");
    }
    res.json(results);
  });
});

export default router;
