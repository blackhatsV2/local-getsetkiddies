# GetSetKiddies

A secure child GPS tracking application, we built it with Node.js, Express, and MySQL.

## Team Members

- **Georgy dela Cruz** — Lead Programmer
- **Ellen Joy Cabaya** — UI/UX
- **Rowena Supleo** — Documenter

## Features
- **Parent Portal**: Secure registration and login for parents.
- **Child Management**: Register multiple children to track.
- **Geofencing**: Set safety zones and get status updates when children enter or leave.
- **History Tracking**: View individual child location history.
- **Hardware Integration**: Serial port support for GPS receiving devices.

## Tech Stack
- **Backend**: Node.js, Express
- **Frontend**: EJS (Embedded JavaScript), Vanilla CSS, JavaScript
- **Database**: MySQL
- **Security**: Password hashing with `bcryptjs`, Session-based authentication.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Server

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with your database credentials and a strong `SESSION_SECRET`.
5. Import the database schema:
   ```bash
   mysql -u root -p getsetkiddies < db/getsetkiddies.sql
   ```

### Running the App
- **Development**: `npm run dev` (uses nodemon)
- **Production**: `npm start`

## Project Structure
- `api/`: Express routers and middleware.
- `db/`: Database connection and SQL schema.
- `public/`: Static assets (CSS, JS, Images).
- `views/`: EJS templates for the UI.
- `server.js`: Entry point.

## Security Audit Fixes (Feb 2026)
This project underwent a security hardening process including:
- Switching from plaintext to hashed passwords.
- Protecting all sensitive API routes with authentication middleware.
- Cleaning up invalid HTML and redundant dependencies.
- Adding input validation for registration.


