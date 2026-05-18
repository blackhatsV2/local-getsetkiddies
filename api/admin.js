import express from "express";
import db from "../db/connection.js";
import bcrypt from "bcryptjs";
import { isAdmin } from "./middleware.js";

const router = express.Router();

// Apply administrative auth protection to all endpoints
router.use(isAdmin);

/* -------------------------------------------------------------
   GET: Fetch all parents and children with location/geofences
------------------------------------------------------------- */
router.get("/data", (req, res) => {
  // Query all parents ordered by date created
  const parentsSql = "SELECT * FROM parents ORDER BY date_created DESC";
  db.query(parentsSql, (err, parents) => {
    if (err) {
      console.error("Error fetching parents for admin:", err);
      return res.status(500).json({ message: "Failed to fetch parents data" });
    }

    // Query all children with their latest location and geofence status
    const childrenSql = `
      SELECT 
        c.*,
        l.latitude AS child_lat, l.longitude AS child_lng, l.readable_address, l.date_time AS last_seen,
        g.id AS geofence_id, g.name AS geofence_name, g.latitude AS fence_lat, g.longitude AS fence_lng, g.radius AS fence_radius
      FROM registered_children c
      LEFT JOIN (
        SELECT l1.*
        FROM locations l1
        JOIN (
          SELECT child_id, MAX(date_time) AS latest
          FROM locations
          GROUP BY child_id
        ) l2 ON l1.child_id = l2.child_id AND l1.date_time = l2.latest
      ) AS l ON c.id = l.child_id
      LEFT JOIN geofences g ON c.id = g.child_id
      ORDER BY c.date_registered DESC
    `;

    db.query(childrenSql, (err, children) => {
      if (err) {
        console.error("Error fetching children for admin:", err);
        return res.status(500).json({ message: "Failed to fetch children data" });
      }

      res.json({ parents, children });
    });
  });
});

/* -------------------------------------------------------------
   POST: Add new Parent
------------------------------------------------------------- */
router.post("/parent", async (req, res) => {
  const { firstname, lastname, email, phone_number, home_address, password } = req.body;

  if (!firstname || !lastname || !email || !password) {
    return res.status(400).json({ message: "First name, Last name, Email, and Password are required" });
  }

  try {
    // Check if email already exists
    db.query("SELECT id FROM parents WHERE email = ?", [email], async (err, rows) => {
      if (err) {
        console.error("DB check failed:", err);
        return res.status(500).json({ message: "Database validation error" });
      }

      if (rows.length > 0) {
        return res.status(400).json({ message: "A parent with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = `
        INSERT INTO parents (firstname, lastname, email, phone_number, home_address, password, date_created)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      const values = [firstname, lastname, email, phone_number, home_address, hashedPassword];

      db.query(sql, values, (insertErr, result) => {
        if (insertErr) {
          console.error("DB insert parent failed:", insertErr);
          return res.status(500).json({ message: "Failed to create parent account" });
        }
        res.json({ message: "Parent account created successfully", parentId: result.insertId });
      });
    });
  } catch (error) {
    console.error("Server error creating parent:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
   POST: Edit Parent
------------------------------------------------------------- */
router.post("/parent/edit/:id", async (req, res) => {
  const parentId = req.params.id;
  const { firstname, lastname, email, phone_number, home_address, password } = req.body;

  if (!firstname || !lastname || !email) {
    return res.status(400).json({ message: "First name, Last name, and Email are required" });
  }

  // Check email uniqueness among other records
  db.query("SELECT id FROM parents WHERE email = ? AND id != ?", [email, parentId], async (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database validation error" });
    }

    if (rows.length > 0) {
      return res.status(400).json({ message: "Another account is already using this email" });
    }

    try {
      let sql, values;

      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        sql = `
          UPDATE parents 
          SET firstname = ?, lastname = ?, email = ?, phone_number = ?, home_address = ?, password = ?
          WHERE id = ?
        `;
        values = [firstname, lastname, email, phone_number, home_address, hashedPassword, parentId];
      } else {
        sql = `
          UPDATE parents 
          SET firstname = ?, lastname = ?, email = ?, phone_number = ?, home_address = ?
          WHERE id = ?
        `;
        values = [firstname, lastname, email, phone_number, home_address, parentId];
      }

      db.query(sql, values, (updateErr) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({ message: "Failed to update parent details" });
        }

        // Maintain denormalized parent fields in registered_children table
        const parentName = `${firstname} ${lastname}`;
        const childrenUpdateSql = `
          UPDATE registered_children 
          SET parent_name = ?, parent_email = ?, parent_number = ?, parent_home_address = ? 
          WHERE parent_id = ?
        `;
        db.query(childrenUpdateSql, [parentName, email, phone_number, home_address, parentId], (childErr) => {
          if (childErr) {
            console.error("Warning: denormalized children columns update failed:", childErr);
          }
          res.json({ message: "Parent details and associated child profiles updated successfully" });
        });
      });
    } catch (hashError) {
      console.error(hashError);
      res.status(500).json({ message: "Internal server error hashing password" });
    }
  });
});

/* -------------------------------------------------------------
   POST: Delete Parent
------------------------------------------------------------- */
router.post("/parent/delete/:id", (req, res) => {
  const parentId = req.params.id;

  // Since db/getsetkiddies-for-aiven.sql has FOREIGN KEY (...parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  // deleting the parent automatically deletes the associated children, locations, and geofences.
  const sql = "DELETE FROM parents WHERE id = ?";
  db.query(sql, [parentId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to delete parent account" });
    }
    res.json({ message: "Parent account and all associated child profiles deleted successfully" });
  });
});

/* -------------------------------------------------------------
   POST: Add new Child
------------------------------------------------------------- */
router.post("/child", (req, res) => {
  const { firstname, lastname, child_age, child_gender, parent_id } = req.body;

  if (!firstname || !lastname || !child_age || !child_gender || !parent_id) {
    return res.status(400).json({ message: "All child fields and parent assignment are required" });
  }

  const age = parseInt(child_age);
  if (isNaN(age) || age < 1 || age > 18) {
    return res.status(400).json({ message: "Child age must be between 1 and 18" });
  }

  // Fetch parent details to populate duplicate helper columns in registered_children
  db.query("SELECT * FROM parents WHERE id = ?", [parent_id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database query error checking parent" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "The assigned parent account does not exist" });
    }

    const parent = rows[0];
    const parentName = `${parent.firstname} ${parent.lastname}`;

    const sql = `
      INSERT INTO registered_children (
        firstname, lastname, child_age, child_gender, parent_id, 
        parent_name, parent_email, parent_number, parent_home_address, date_registered
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      firstname,
      lastname,
      age,
      child_gender,
      parent_id,
      parentName,
      parent.email,
      parent.phone_number,
      parent.home_address
    ];

    db.query(sql, values, (insertErr, result) => {
      if (insertErr) {
        console.error(insertErr);
        return res.status(500).json({ message: "Failed to register new child" });
      }
      res.json({ message: "Child registered successfully", childId: result.insertId });
    });
  });
});

/* -------------------------------------------------------------
   POST: Edit Child
------------------------------------------------------------- */
router.post("/child/edit/:id", (req, res) => {
  const childId = req.params.id;
  const { firstname, lastname, child_age, child_gender, parent_id } = req.body;

  if (!firstname || !lastname || !child_age || !child_gender || !parent_id) {
    return res.status(400).json({ message: "All fields are required to update child" });
  }

  const age = parseInt(child_age);
  if (isNaN(age) || age < 1 || age > 18) {
    return res.status(400).json({ message: "Child age must be between 1 and 18" });
  }

  // Fetch parent details for the chosen parent_id to ensure correctness
  db.query("SELECT * FROM parents WHERE id = ?", [parent_id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database checking parent failed" });
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "Assigned parent account not found" });
    }

    const parent = rows[0];
    const parentName = `${parent.firstname} ${parent.lastname}`;

    const sql = `
      UPDATE registered_children 
      SET firstname = ?, lastname = ?, child_age = ?, child_gender = ?, parent_id = ?, 
          parent_name = ?, parent_email = ?, parent_number = ?, parent_home_address = ?
      WHERE id = ?
    `;
    const values = [
      firstname,
      lastname,
      age,
      child_gender,
      parent_id,
      parentName,
      parent.email,
      parent.phone_number,
      parent.home_address,
      childId
    ];

    db.query(sql, values, (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return res.status(500).json({ message: "Failed to update child profile" });
      }
      res.json({ message: "Child profile updated successfully" });
    });
  });
});

/* -------------------------------------------------------------
   POST: Delete Child
------------------------------------------------------------- */
router.post("/child/delete/:id", (req, res) => {
  const childId = req.params.id;

  // Thanks to ON DELETE CASCADE on fk_child_geofence and fk_child_location,
  // locations and geofences are automatically removed.
  const sql = "DELETE FROM registered_children WHERE id = ?";
  db.query(sql, [childId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to delete child profile" });
    }
    res.json({ message: "Child profile and their tracking records deleted successfully" });
  });
});

export default router;
