import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || "rental.db";
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
const JWT_SECRET = "your-super-secret-key-for-rental-app";

// Initialize Database Schema with ON DELETE CASCADE
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT CHECK(role IN ('ADMIN', 'LANDLORD', 'CARETAKER')),
    name TEXT,
    phone TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    location TEXT,
    owner_id INTEGER,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LOCKED')),
    caretaker_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(caretaker_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    unit_number TEXT,
    monthly_rent REAL,
    status TEXT DEFAULT 'VACANT' CHECK(status IN ('VACANT', 'OCCUPIED')),
    FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER,
    full_name TEXT,
    phone TEXT,
    national_id TEXT,
    move_in_date DATE,
    deposit REAL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'VERIFICATION_REQUIRED')),
    last_verification_date DATETIME,
    FOREIGN KEY(unit_id) REFERENCES units(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    amount REAL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    month INTEGER,
    year INTEGER,
    transaction_id TEXT UNIQUE,
    method TEXT,
    type TEXT CHECK(type IN ('RENT', 'DEPOSIT')),
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS occupancy_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    photo_url TEXT,
    entrance_photo_url TEXT,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
`);

// Seed Admin if not exists
const defaultAdmin = db.prepare("SELECT * FROM users WHERE email = 'admin@rentmaster.com'").get();
if (defaultAdmin) {
  // Update the default admin to the new credentials
  const hash = bcrypt.hashSync("chryseler", 10);
  db.prepare("UPDATE users SET email = ?, password_hash = ?, name = ? WHERE id = ?").run(
    "letianmax27@gmail.com",
    hash,
    "System Admin",
    defaultAdmin.id
  );
} else {
  const adminExists = db.prepare("SELECT * FROM users WHERE email = 'letianmax27@gmail.com'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync("chryseler", 10);
    db.prepare("INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)").run(
      "letianmax27@gmail.com",
      hash,
      "ADMIN",
      "System Admin"
    );
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // RBAC Middleware
  const authorize = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };

  // --- Consolidated Init Route ---
  app.get("/api/init", authenticate, (req: any, res) => {
    try {
      const headers = { 'Authorization': `Bearer ${req.headers.authorization}` };
      
      // 1. Properties
      let properties;
      const propQuery = `
        SELECT p.*, u.name as owner_name, c.name as caretaker_name 
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        LEFT JOIN users c ON p.caretaker_id = c.id
      `;
      if (req.user.role === 'ADMIN') {
        properties = db.prepare(propQuery).all();
      } else if (req.user.role === 'LANDLORD') {
        properties = db.prepare(`${propQuery} WHERE p.owner_id = ?`).all(req.user.id);
      } else {
        properties = db.prepare(`${propQuery} WHERE p.caretaker_id = ?`).all(req.user.id);
      }

      // 2. Tenants
      let tenants;
      const tenantQuery = `
        SELECT t.*, u.unit_number, p.name as property_name 
        FROM tenants t 
        JOIN units u ON t.unit_id = u.id 
        JOIN properties p ON u.property_id = p.id
      `;
      if (req.user.role === 'ADMIN') {
        tenants = db.prepare(tenantQuery).all();
      } else if (req.user.role === 'LANDLORD') {
        tenants = db.prepare(`${tenantQuery} WHERE p.owner_id = ? AND p.status != 'LOCKED'`).all(req.user.id);
      } else {
        tenants = db.prepare(`${tenantQuery} WHERE p.caretaker_id = ? AND p.status != 'LOCKED'`).all(req.user.id);
      }

      // 3. Payments
      let payments;
      const payQuery = `
        SELECT pay.*, t.full_name as tenant_name, u.unit_number, p.name as property_name
        FROM payments pay
        JOIN tenants t ON pay.tenant_id = t.id
        JOIN units u ON t.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
      `;
      if (req.user.role === 'ADMIN') {
        payments = db.prepare(payQuery).all();
      } else if (req.user.role === 'LANDLORD') {
        payments = db.prepare(`${payQuery} WHERE p.owner_id = ? AND p.status != 'LOCKED'`).all(req.user.id);
      } else {
        payments = db.prepare(`${payQuery} WHERE p.caretaker_id = ? AND p.status != 'LOCKED'`).all(req.user.id);
      }

      // 4. Role specific data
      let globalStats = null;
      let landlords = null;
      let caretakers = null;

      if (req.user.role === 'ADMIN') {
        const units = db.prepare("SELECT status FROM units").all();
        const occupied = units.filter((u: any) => u.status === 'OCCUPIED').length;
        globalStats = {
          totalProperties: db.prepare("SELECT COUNT(*) as count FROM properties").get().count,
          totalLandlords: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'LANDLORD'").get().count,
          totalTenants: db.prepare("SELECT COUNT(*) as count FROM tenants").get().count,
          totalRevenue: db.prepare("SELECT SUM(amount) as sum FROM payments").get().sum || 0,
          occupancyRate: units.length ? (occupied / units.length) * 100 : 0
        };
        landlords = db.prepare("SELECT id, name, email FROM users WHERE role = 'LANDLORD'").all();
        caretakers = db.prepare("SELECT id, name, email FROM users WHERE role = 'CARETAKER'").all();
      } else if (req.user.role === 'LANDLORD') {
        caretakers = db.prepare("SELECT id, name, email FROM users WHERE role = 'CARETAKER' AND created_by = ?").all(req.user.id);
      }

      res.json({
        properties,
        tenants,
        payments,
        globalStats,
        landlords,
        caretakers
      });
    } catch (err: any) {
      console.error("Init error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Auth Routes ---
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET);
      res.json({ token, user: { id: user.id, role: user.role, email: user.email, name: user.name } });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { email, password, role, name, phone } = req.body;
    
    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if requester is authenticated to determine created_by
    let creatorId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        creatorId = decoded.id;
      } catch (err) {
        // Ignore invalid token for public registration
      }
    }

    // Restrict public registration to LANDLORD only
    // If authenticated, allow the role passed (e.g. Landlord creating Caretaker)
    let assignedRole = role || 'LANDLORD';
    if (!creatorId && assignedRole === 'ADMIN') {
      assignedRole = 'LANDLORD';
    }

    const hash = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (email, password_hash, role, name, phone, created_by) VALUES (?, ?, ?, ?, ?, ?)").run(
        email, hash, assignedRole, name, phone, creatorId
      );
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // --- Property Routes ---
  app.get("/api/properties", authenticate, (req: any, res) => {
    let properties;
    const query = `
      SELECT p.*, u.name as owner_name, c.name as caretaker_name 
      FROM properties p 
      LEFT JOIN users u ON p.owner_id = u.id 
      LEFT JOIN users c ON p.caretaker_id = c.id
    `;

    if (req.user.role === 'ADMIN') {
      properties = db.prepare(query).all();
    } else if (req.user.role === 'LANDLORD') {
      properties = db.prepare(`${query} WHERE p.owner_id = ?`).all(req.user.id);
    } else if (req.user.role === 'CARETAKER') {
      properties = db.prepare(`${query} WHERE p.caretaker_id = ?`).all(req.user.id);
    }
    res.json(properties);
  });

  app.post("/api/properties", authenticate, authorize(['ADMIN', 'LANDLORD']), (req: any, res) => {
    const { name, location, owner_id, caretaker_id } = req.body;
    const ownerId = req.user.role === 'ADMIN' ? owner_id : req.user.id;
    const result = db.prepare("INSERT INTO properties (name, location, owner_id, caretaker_id) VALUES (?, ?, ?, ?)").run(
      name, location, ownerId, caretaker_id
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/properties/:id/status", authenticate, authorize(['ADMIN']), (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE properties SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // --- Unit Routes ---
  app.get("/api/properties/:id/units", authenticate, (req: any, res) => {
    const prop: any = db.prepare("SELECT status FROM properties WHERE id = ?").get(req.params.id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    
    if (prop.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Property is locked and inaccessible" });
    }

    const units = db.prepare("SELECT * FROM units WHERE property_id = ?").all(req.params.id);
    res.json(units);
  });

  app.post("/api/units", authenticate, authorize(['ADMIN', 'LANDLORD']), (req: any, res) => {
    const { property_id, unit_number, monthly_rent } = req.body;
    // Check if property is locked
    const prop: any = db.prepare("SELECT status FROM properties WHERE id = ?").get(property_id);
    if (prop.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Property is locked" });
    }
    const result = db.prepare("INSERT INTO units (property_id, unit_number, monthly_rent) VALUES (?, ?, ?)").run(
      property_id, unit_number, monthly_rent
    );
    res.json({ id: result.lastInsertRowid });
  });

  // --- Tenant Routes ---
  app.get("/api/tenants", authenticate, (req: any, res) => {
    let tenants;
    if (req.user.role === 'ADMIN') {
      tenants = db.prepare(`
        SELECT t.*, u.unit_number, p.name as property_name 
        FROM tenants t 
        JOIN units u ON t.unit_id = u.id 
        JOIN properties p ON u.property_id = p.id
      `).all();
    } else if (req.user.role === 'LANDLORD') {
      tenants = db.prepare(`
        SELECT t.*, u.unit_number, p.name as property_name 
        FROM tenants t 
        JOIN units u ON t.unit_id = u.id 
        JOIN properties p ON u.property_id = p.id 
        WHERE p.owner_id = ? AND p.status != 'LOCKED'
      `).all(req.user.id);
    } else {
      tenants = db.prepare(`
        SELECT t.*, u.unit_number, p.name as property_name 
        FROM tenants t 
        JOIN units u ON t.unit_id = u.id 
        JOIN properties p ON u.property_id = p.id 
        WHERE p.caretaker_id = ? AND p.status != 'LOCKED'
      `).all(req.user.id);
    }
    res.json(tenants);
  });

  app.post("/api/tenants", authenticate, authorize(['ADMIN', 'LANDLORD', 'CARETAKER']), (req: any, res) => {
    const { unit_id, full_name, phone, national_id, move_in_date, deposit } = req.body;
    
    // Check lock
    const unit: any = db.prepare("SELECT property_id FROM units WHERE id = ?").get(unit_id);
    const prop: any = db.prepare("SELECT status FROM properties WHERE id = ?").get(unit.property_id);
    if (prop.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Property is locked" });
    }

    const result = db.prepare("INSERT INTO tenants (unit_id, full_name, phone, national_id, move_in_date, deposit) VALUES (?, ?, ?, ?, ?, ?)").run(
      unit_id, full_name, phone, national_id, move_in_date, deposit
    );
    db.prepare("UPDATE units SET status = 'OCCUPIED' WHERE id = ?").run(unit_id);
    res.json({ id: result.lastInsertRowid });
  });

  // --- Payment Routes ---
  app.get("/api/payments", authenticate, (req: any, res) => {
    let payments;
    const query = `
      SELECT pay.*, t.full_name as tenant_name, u.unit_number, p.name as property_name
      FROM payments pay
      JOIN tenants t ON pay.tenant_id = t.id
      JOIN units u ON t.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
    `;
    if (req.user.role === 'ADMIN') {
      payments = db.prepare(query).all();
    } else if (req.user.role === 'LANDLORD') {
      payments = db.prepare(query + " WHERE p.owner_id = ? AND p.status != 'LOCKED'").all(req.user.id);
    } else {
      payments = db.prepare(query + " WHERE p.caretaker_id = ? AND p.status != 'LOCKED'").all(req.user.id);
    }
    res.json(payments);
  });

  app.post("/api/payments", authenticate, authorize(['ADMIN', 'LANDLORD', 'CARETAKER']), (req: any, res) => {
    const { tenant_id, amount, month, year, transaction_id, method, type } = req.body;
    
    // Check lock
    const tenant: any = db.prepare("SELECT unit_id FROM tenants WHERE id = ?").get(tenant_id);
    const unit: any = db.prepare("SELECT property_id FROM units WHERE id = ?").get(tenant.unit_id);
    const prop: any = db.prepare("SELECT status FROM properties WHERE id = ?").get(unit.property_id);
    if (prop.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Property is locked" });
    }

    const result = db.prepare("INSERT INTO payments (tenant_id, amount, month, year, transaction_id, method, type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      tenant_id, amount, month, year, transaction_id, method, type
    );
    res.json({ id: result.lastInsertRowid });
  });

  // --- Analytics Routes ---
  app.get("/api/analytics/global", authenticate, authorize(['ADMIN']), (req, res) => {
    const stats = {
      totalProperties: db.prepare("SELECT COUNT(*) as count FROM properties").get().count,
      totalLandlords: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'LANDLORD'").get().count,
      totalTenants: db.prepare("SELECT COUNT(*) as count FROM tenants").get().count,
      totalRevenue: db.prepare("SELECT SUM(amount) as sum FROM payments").get().sum || 0,
      occupancyRate: 0
    };
    const units = db.prepare("SELECT status FROM units").all();
    const occupied = units.filter((u: any) => u.status === 'OCCUPIED').length;
    stats.occupancyRate = units.length ? (occupied / units.length) * 100 : 0;
    res.json(stats);
  });

  app.get("/api/analytics/property/:id", authenticate, (req: any, res) => {
    const propId = req.params.id;
    const prop: any = db.prepare("SELECT status FROM properties WHERE id = ?").get(propId);
    if (!prop) return res.status(404).json({ error: "Property not found" });

    if (prop.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Property is locked" });
    }

    const units = db.prepare("SELECT * FROM units WHERE property_id = ?").all(propId);
    const occupied = units.filter((u: any) => u.status === 'OCCUPIED').length;
    const expectedRent = units.reduce((acc: number, u: any) => acc + (u.monthly_rent || 0), 0);
    
    const payments = db.prepare(`
      SELECT SUM(amount) as sum FROM payments pay
      JOIN tenants t ON pay.tenant_id = t.id
      JOIN units u ON t.unit_id = u.id
      WHERE u.property_id = ?
    `).get(propId).sum || 0;

    res.json({
      totalUnits: units.length,
      occupiedUnits: occupied,
      occupancyRate: units.length ? (occupied / units.length) * 100 : 0,
      vacancyRate: units.length ? ((units.length - occupied) / units.length) * 100 : 0,
      expectedRent,
      collectedRent: payments,
      arrears: Math.max(0, expectedRent - payments) // Simplified for demo
    });
  });

  app.post("/api/quick-setup", authenticate, authorize(['LANDLORD']), (req: any, res) => {
    const { propertyName, location, caretakerName, caretakerEmail, caretakerPassword, caretakerPhone } = req.body;
    
    if (!propertyName || !location || !caretakerName || !caretakerEmail || !caretakerPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const transaction = db.transaction(() => {
        // 1. Create Caretaker
        const hash = bcrypt.hashSync(caretakerPassword, 10);
        const userResult = db.prepare(`
          INSERT INTO users (email, password_hash, role, name, phone, created_by)
          VALUES (?, ?, 'CARETAKER', ?, ?, ?)
        `).run(caretakerEmail, hash, caretakerName, caretakerPhone, req.user.id);
        
        const caretakerId = userResult.lastInsertRowid;

        // 2. Create Property
        const propResult = db.prepare(`
          INSERT INTO properties (name, location, owner_id, caretaker_id)
          VALUES (?, ?, ?, ?)
        `).run(propertyName, location, req.user.id, caretakerId);
        
        return { propertyId: propResult.lastInsertRowid, caretakerId };
      });

      const result = transaction();
      res.status(201).json(result);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: "Caretaker email already exists" });
      }
      console.error(err);
      res.status(500).json({ error: "Failed to perform quick setup" });
    }
  });

  // --- User Management ---
  app.get("/api/users/landlords", authenticate, authorize(['ADMIN']), (req, res) => {
    const landlords = db.prepare("SELECT id, name, email FROM users WHERE role = 'LANDLORD'").all();
    res.json(landlords);
  });

  app.patch("/api/users/:id/reset-password", authenticate, authorize(['ADMIN']), (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password is required" });
    
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/properties/:id", authenticate, authorize(['ADMIN']), (req, res) => {
    const propId = parseInt(req.params.id);
    console.log(`[DELETE] Request to delete property ID: ${propId}`);
    if (isNaN(propId)) return res.status(400).json({ error: "Invalid property ID" });
    
    try {
      // With ON DELETE CASCADE enabled in the schema, we only need to delete the property.
      // SQLite will handle the rest automatically.
      const result = db.prepare("DELETE FROM properties WHERE id = ?").run(propId);
      console.log(`[DELETE] Deleted property result: ${result.changes}`);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[DELETE] Error deleting property:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/caretakers", authenticate, authorize(['ADMIN', 'LANDLORD']), (req: any, res) => {
    let caretakers;
    if (req.user.role === 'ADMIN') {
      caretakers = db.prepare("SELECT id, name, email FROM users WHERE role = 'CARETAKER'").all();
    } else {
      // Landlords only see caretakers they created
      caretakers = db.prepare("SELECT id, name, email FROM users WHERE role = 'CARETAKER' AND created_by = ?").all(req.user.id);
    }
    res.json(caretakers);
  });

  const server = app.listen(3000, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:3000`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Vite creation error:", err);
    }
  } else {
    // Production: Serve static files from dist
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    
    // SPA fallback: Serve index.html for all non-API routes
    app.get("*", (req, res, next) => {
      if (req.url.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });
}

startServer();
