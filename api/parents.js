import express from "express";
import db from "../db/connection.js";
import bcrypt from "bcryptjs";

const router = express.Router();

/* -----------------------------
   API: Register new parent
----------------------------- */
router.post("/register", async (req, res) => {
  const { firstname, lastname, email, number, home_address, password } = req.body;

  if (!firstname || !lastname || !email || !password) {
    return res.status(400).send("All fields are required");
  }

  // Basic email validation
  if (!email.includes("@")) {
    return res.status(400).send("Invalid email format");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO parents (firstname, lastname, email, phone_number, home_address, password, date_created)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    db.query(sql, [firstname, lastname, email, number, home_address, hashedPassword], (err) => {
      if (err) {
        console.error("Error registering parent:", err);
        return res.status(500).send("Database error");
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).send("Server error");
  }
});

/* -----------------------------
   API: Parent login
----------------------------- */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM parents WHERE email = ?";
  db.query(sql, [email], async (err, result) => {
    if (err) {
      console.error("Error logging in:", err);
      return res.status(500).send("Database error");
    }

    if (result.length === 0) return res.status(401).send("Invalid credentials");

    const parent = result[0];
    let match = false;

    try {
      match = await bcrypt.compare(password, parent.password);
    } catch (e) {
      console.warn("Bcrypt compare failed, might be plain text:", e.message);
    }

    if (!match) {
      // Check for plain text legacy password
      if (password === parent.password) {
        console.log(`Legacy plain text password detected for user ${email}. Migrating...`);
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          const updateSql = "UPDATE parents SET password = ? WHERE id = ?";
          db.query(updateSql, [hashedPassword, parent.id], (updateErr) => {
            if (updateErr) {
              console.error("Error migrating password:", updateErr);
              // We can still let them log in even if migration failed this time
            }
          });
          match = true;
        } catch (hashErr) {
          console.error("Error hashing password during migration:", hashErr);
        }
      }
    }

    if (!match) return res.status(401).send("Invalid credentials");

    // Don't store password in session
    const { password: _, ...parentData } = parent;
    req.session.parent = parentData;
    res.redirect("/geofence-view");
  });
});

/* -----------------------------
   API: Logout parent
----------------------------- */
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Error logging out");
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

/* -----------------------------
   PAGE: Track Child
----------------------------- */
router.get("/", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.redirect("/login");

  const sql = `
    SELECT 
      c.id, c.firstname, c.lastname, c.child_age, c.child_gender, c.date_registered,
      l.latitude, l.longitude, l.readable_address, l.date_time,
      g.id AS geofence_id
    FROM registered_children AS c
    LEFT JOIN (
      SELECT l1.*
      FROM locations l1
      JOIN (
        SELECT child_id, MAX(date_time) AS latest
        FROM locations
        GROUP BY child_id
      ) l2 ON l1.child_id = l2.child_id AND l1.date_time = l2.latest
    ) AS l ON c.id = l.child_id
    LEFT JOIN geofences AS g ON c.id = g.child_id
    WHERE c.parent_id = ?
    ORDER BY c.date_registered DESC
  `;

  db.query(sql, [parent.id], (err, results) => {
    if (err) {
      console.error("Error fetching children:", err);
      return res.status(500).send("Database error");
    }

    res.render("pages/track-child", {
      title: "Track Your Child",
      parent,
      children: results,
    });
  });
});

/* -----------------------------------------
   PAGE: Manage Children
----------------------------------------- */
router.get("/manage-children", (req, res) => {
  const parent = req.session.parent;
  if (!parent) return res.redirect("/login");

  res.render("pages/manage-children", {
    title: "Manage Children",
    parent
  });
});

export default router;
