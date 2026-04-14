import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

import db from "./db/connection.js";

import parentRoutes from "./api/parents.js";
import childRoutes from "./api/children.js";
import locationRoutes from "./api/locations.js";
import geofenceRoutes from "./api/geofences.js";
const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    },
  })
);




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");




app.use("/api/parents", parentRoutes);
app.use("/api/children", childRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/geofences", geofenceRoutes);




app.get("/", (req, res) => {
  res.render("pages/index", { title: "Get Set Kiddies" });
});
app.get("/about", (req, res) => {
  res.render("pages/about", { title: "About GetSet Kiddies" });
});

app.get("/login", (req, res) => {
  res.render("pages/login", { title: "Parent Login" });
});

app.get("/register", (req, res) => {
  res.render("pages/register", { title: "Parent Registration" });
});

app.get("/manage-children", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/manage-children", {
    title: "Get Set Kiddies - Manage Children",
    parent: req.session.parent,
  });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/dashboard", {
    title: "Get Set Kiddies",
    parent: req.session.parent,
  });
});

app.get("/register-child", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");
  res.render("pages/register-child", {
    title: "Get Set Kiddies",
    parent: req.session.parent,
  });
});

app.get("/track-child", (req, res) => res.redirect("/api/parents"));

app.get("/geofence-setup", (req, res) => res.redirect("/api/geofences/setup"));

app.get("/geofence-view", (req, res) => {
  if (!req.session.parent) return res.redirect("/login");

  const parent = req.session.parent;

  const sql = `
    SELECT 
      g.id AS geofence_id, g.name AS geofence_name, g.latitude AS fence_lat, g.longitude AS fence_lng, g.radius,
      c.id AS child_id, c.firstname, c.lastname,
      l.latitude AS child_lat, l.longitude AS child_lng, l.date_time
    FROM geofences AS g
    JOIN registered_children AS c ON g.child_id = c.id
    LEFT JOIN (
      SELECT l1.*
      FROM locations l1
      JOIN (
        SELECT child_id, MAX(date_time) AS latest
        FROM locations
        GROUP BY child_id
      ) l2 ON l1.child_id = l2.child_id AND l1.date_time = l2.latest
    ) AS l ON c.id = l.child_id
    WHERE c.parent_id = ?
    ORDER BY g.created_at DESC
  `;

  db.query(sql, [parent.id], (err, rows) => {
    if (err) {
      console.error("Error fetching geofences:", err);
      return res.status(500).send("Database error");
    }

    res.render("pages/geofence-view", {
      title: "View Geofences",
      parent,
      geofences: rows,
    });
  });
});



app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page Not Found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandle Error:", err);
  res.status(500).render("pages/404", { title: "Server Error", message: "Something went wrong!" });
});





const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Ensure SESSION_SECRET is set or use a placeholder to avoid crash
if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET is not set in environment variables. Using a temporary secret for now.");
}

app.listen(PORT, HOST, () => {
  console.log(`Server is running!`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://${HOST}:${PORT}`);
});
