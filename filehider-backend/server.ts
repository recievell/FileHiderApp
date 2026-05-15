import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

type AnyRequest = Request<any, any, any, any>;

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'filehider_dev_secret';
const DB_PATH = process.env.DB_PATH || "./chat.db";

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set in .env. Using default development JWT secret.');
}


type User = {
  userid: string;
  username: string;
  pin_hash: string;
  storage_used_mb: number;
  created_at: string;
};


const sqlite = sqlite3.verbose();

const db = new sqlite.Database(DB_PATH, (err) => {
     if (err) {
          console.error("Database error:", err.message);
     } else {
          console.log("Connected to SQLite database ");
     }
});

const dbGet = (query: string, params: any[] = []) =>
  new Promise<any>((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const dbRun = (query: string, params: any[] = []) =>
  new Promise<any>((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const dbAll = (query: string, params: any[] = []) =>
  new Promise<any[]>((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// Run simple migration to add missing columns if DB was created with older schema
(async () => {
  try {
    const cols: any[] = await dbAll("PRAGMA table_info(users)");
    const names = cols.map((c) => c.name);
    if (!names.includes('pin_hash')) {
      console.log('Migrating: adding pin_hash to users table');
      await dbRun("ALTER TABLE users ADD COLUMN pin_hash TEXT DEFAULT ''");
    }
    if (!names.includes('storage_used_mb')) {
      console.log('Migrating: adding storage_used_mb to users table');
      await dbRun("ALTER TABLE users ADD COLUMN storage_used_mb REAL DEFAULT 0.0");
    }
  } catch (err) {
    console.error('DB migration error:', err);
  }
})();


const app = express();

app.use(cors());
app.use(express.json());

db.run(`
      CREATE TABLE IF NOT EXISTS users (
        userid TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        pin_hash TEXT NOT NULL,
        storage_used_mb REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
   `);

db.run(`
      CREATE TABLE IF NOT EXISTS user_files (
        file_id TEXT PRIMARY KEY,
        userid TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mimetype TEXT,
        category TEXT DEFAULT 'file',
        size_bytes INTEGER,
        path TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userid) REFERENCES users(userid)
      )
   `);

const UPLOADS_DIR = path.resolve(process.cwd(), process.env.UPLOADS_DIR || './uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req: AnyRequest, file: any, cb: any) => {
    const userId = req.body?.userId || DEVICE_USERID;
    const dir = path.join(UPLOADS_DIR, userId.toString());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: AnyRequest, file: any, cb: any) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  },
});

const upload = multer({ storage });

const DEVICE_USERNAME = 'user1';
const DEVICE_USERID = 'USER-1';

const ensureDeviceUser = async () => {
  const query = `SELECT userid FROM users WHERE username = ?`;
  const row = await dbGet(query, [DEVICE_USERNAME]);
  if (row?.userid) {
    return row.userid;
  }

  const insert = `
    INSERT INTO users (userid, username, pin_hash, storage_used_mb)
    VALUES (?, ?, ?, ?)
  `;
  await dbRun(insert, [DEVICE_USERID, DEVICE_USERNAME, '', 0.0]);
  return DEVICE_USERID;
};


app.get("/", (req: AnyRequest, res: Response) => {
     res.send("Backend is running");
   });

// DEBUG ENDPOINT - Check database tables
app.get("/debug/tables", (req: AnyRequest, res: Response) => {
  const tables = ['users', 'user_files'];
  const results: any = {};
  let completed = 0;

  tables.forEach(table => {
    const query = `SELECT COUNT(*) as count FROM ${table}`;
    db.get(query, [], (err, row: any) => {
      if (err) {
        results[table] = { error: err.message, count: 0 };
      } else {
        results[table] = { count: row.count };
      }
      completed++;
      if (completed === tables.length) {
        res.json({ tables: results });
      }
    });
  });
});

app.post('/auth/setup', async (req: AnyRequest, res: Response) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return res.status(400).json({ message: 'PIN must be 6 digits' });
  }

  try {
    const userId = await ensureDeviceUser();
    const row = await dbGet('SELECT pin_hash FROM users WHERE userid = ?', [userId]);

    if (row?.pin_hash) {
      return res.status(400).json({ message: 'PIN already configured' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await dbRun('UPDATE users SET pin_hash = ? WHERE userid = ?', [hashedPin, userId]);

    const token = jwt.sign({ userId, username: DEVICE_USERNAME }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'PIN configured successfully', token });
  } catch (error: any) {
    console.error('Auth setup error:', error?.stack || error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/verify', async (req: AnyRequest, res: Response) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return res.status(400).json({ message: 'PIN must be 6 digits' });
  }

  try {
    const userId = await ensureDeviceUser();
    const row = await dbGet('SELECT pin_hash FROM users WHERE userid = ?', [userId]);

    if (!row?.pin_hash) {
      return res.status(404).json({ message: 'PIN not configured' });
    }

    const match = await bcrypt.compare(pin, row.pin_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    const token = jwt.sign({ userId, username: DEVICE_USERNAME }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'PIN verified', token });
  } catch (error: any) {
    console.error('Auth verify error:', error?.stack || error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/auth/reset', async (req: AnyRequest, res: Response) => {
  const { currentPin, newPin } = req.body;

  if (!currentPin || !newPin || currentPin.length !== 6 || newPin.length !== 6) {
    return res.status(400).json({ message: 'Both current and new PIN must be 6 digits' });
  }

  try {
    const userId = await ensureDeviceUser();
    const row = await dbGet('SELECT pin_hash FROM users WHERE userid = ?', [userId]);

    if (!row?.pin_hash) {
      return res.status(404).json({ message: 'PIN not configured' });
    }

    const match = await bcrypt.compare(currentPin, row.pin_hash);
    if (!match) {
      return res.status(401).json({ message: 'Current PIN is incorrect' });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await dbRun('UPDATE users SET pin_hash = ? WHERE userid = ?', [hashedPin, userId]);
    res.json({ message: 'PIN reset successfully' });
  } catch (error: any) {
    console.error('Auth reset error:', error?.stack || error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post("/chat", (req: AnyRequest, res: Response) => {
const authHeader = req.headers.authorization;

if (!authHeader) {
  return res.status(403).json({ message: "No token provided" });
}

const token = authHeader.split(" ")[1];

try {
  jwt.verify(token, JWT_SECRET);

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ reply: "No message provided" });
  }

  const msg = message.toLowerCase();
let reply: string;

  if (msg === "hello") reply = "Hi there 👋";
  else if (msg === "how are you") reply = "I'm just a bot 🤖";
  else if (msg === "bye") reply = "Goodbye!";
  else reply = "I don't understand that yet.";

  res.json({ reply });
} catch (error) {
  return res.status(401).json({ message: "Invalid token" });
}
});

// Middleware to verify token and get userId
const verifyToken = (req: AnyRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.body.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// VAULT ENDPOINTS - REMOVED
// All vault functionality replaced with simple user file management

// Get user files
app.get("/files", verifyToken, (req: AnyRequest, res: Response) => {
  try {
    const userId = req.body.userId;

    const query = `
      SELECT file_id, original_name, mimetype, category, size_bytes, uploaded_at
      FROM user_files
      WHERE userid = ?
      ORDER BY uploaded_at DESC
    `;

    db.all(query, [userId], (err, files: any[]) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      res.json({
        files: files || [],
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload file for user
app.post("/files", verifyToken, upload.single('file'), (req: AnyRequest, res: Response) => {
  try {
    const category = req.body.category || 'file';
    const userId = req.body.userId;
    const file = (req as any).file;

    console.log('===== FILE UPLOAD REQUEST =====');
    console.log('Body:', req.body);
    console.log('File details:', file ? { name: file.originalname, size: file.size, mime: file.mimetype, path: file.path } : 'No file');

    if (!file) {
      console.error('ERROR: No file in request');
      return res.status(400).json({ message: "File upload required" });
    }

    if (!userId) {
      console.error('ERROR: No userId in request');
      return res.status(401).json({ message: "Unauthorized: No user ID" });
    }

    const fileId = `FILE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const storedName = path.basename(file.path);
    const finalPath = file.path;

    const insertQuery = `
      INSERT INTO user_files (file_id, userid, original_name, stored_name, mimetype, category, size_bytes, path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [fileId, userId, file.originalname, storedName, file.mimetype, category, file.size, finalPath], function (err) {
      if (err) {
        console.error('ERROR: Database insert error:', err);
        // Clean up file if database insert fails
        try { fs.unlinkSync(finalPath); } catch {}
        return res.status(500).json({ message: "Failed to save file metadata" });
      }

      // Update user's storage used
      const updateStorageQuery = `
        UPDATE users SET storage_used_mb = storage_used_mb + ? WHERE userid = ?
      `;
      const sizeMB = file.size / (1024 * 1024);
      db.run(updateStorageQuery, [sizeMB, userId]);

      console.log('SUCCESS: File uploaded:', { fileId, originalName: file.originalname, size: file.size });
      res.json({
        message: "File uploaded successfully",
        fileId,
        file: {
          file_id: fileId,
          original_name: file.originalname,
          mimetype: file.mimetype,
          category,
          size_bytes: file.size,
          uploaded_at: new Date().toISOString(),
        }
      });
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ message: "Server error", error: (error as any).message });
  }
});

// Delete user file
app.delete("/files/:fileId", verifyToken, (req: AnyRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.body.userId;

    // First get file info to delete from filesystem and update storage
    const selectQuery = `SELECT path, size_bytes FROM user_files WHERE file_id = ? AND userid = ?`;
    db.get(selectQuery, [fileId, userId], (err, file: any) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete from filesystem
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (fsError) {
        console.error('Error deleting file from filesystem:', fsError);
      }

      // Delete from database
      const deleteQuery = `DELETE FROM user_files WHERE file_id = ? AND userid = ?`;
      db.run(deleteQuery, [fileId, userId], function (deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ message: "Database error" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "File not found" });
        }

        // Update user's storage used
        const sizeMB = file.size_bytes / (1024 * 1024);
        const updateStorageQuery = `
          UPDATE users SET storage_used_mb = storage_used_mb - ? WHERE userid = ?
        `;
        db.run(updateStorageQuery, [sizeMB, userId]);

        res.json({ message: "File deleted successfully" });
      });
    });
  } catch (error) {
    console.error('Delete file endpoint error:', error);
    res.status(500).json({ message: "Server error", error: (error as any).message });
  }
});

app.post("/admin/login", (req: AnyRequest, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  // Simple admin check - in production, use proper admin table
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { username: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Admin login successful",
      token,
      user: { username: 'admin', role: 'admin' },
    });
  } else {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
});

// Admin endpoint to get all users and their storage
app.get("/admin/users", (req: AnyRequest, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all users with their storage info
    const userQuery = `SELECT userid, username, storage_used_mb, created_at FROM users`;

    db.all(userQuery, [], (err, users: any[]) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      // For each user, count their files
      const usersWithStats = users.map(user => ({
        ...user,
        fileCount: 0, // Will be populated below
        storageUsed: `${user.storage_used_mb.toFixed(1)} MB`,
      }));

      // Get file counts for each user
      const fileCountPromises = users.map(user =>
        new Promise((resolve) => {
          db.get(`SELECT COUNT(*) as count FROM user_files WHERE userid = ?`, [user.userid], (err, result: any) => {
            if (err) resolve(0);
            else resolve(result.count || 0);
          });
        })
      );

      Promise.all(fileCountPromises).then(counts => {
        usersWithStats.forEach((user, index) => {
          user.fileCount = counts[index] as number;
        });
        res.json({ users: usersWithStats });
      });
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

// Admin endpoint to delete a user and all their data
app.delete("/admin/users/:userId", (req: AnyRequest, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const { userId } = req.params;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Delete user's files first (foreign key constraint)
    const deleteFilesQuery = `DELETE FROM user_files WHERE userid = ?`;

    db.run(deleteFilesQuery, [userId], function(err) {
      if (err) {
        return res.status(500).json({ message: "Error deleting user files" });
      }

      // Then delete the user
      const deleteUserQuery = `DELETE FROM users WHERE userid = ?`;

      db.run(deleteUserQuery, [userId], function(err) {
        if (err) {
          return res.status(500).json({ message: "Error deleting user" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User and all data deleted successfully" });
      });
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

app.post("/auth/setup", async (req: AnyRequest, res: Response) => {
  try {
    const { pin } = req.body;

    if (!pin || !/^[0-9]{6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 6 digits" });
    }

    const userId = await ensureDeviceUser();
    const pinHash = await bcrypt.hash(pin, 10);

    const updateQuery = `UPDATE users SET pin_hash = ? WHERE userid = ?`;

    db.run(updateQuery, [pinHash, userId], function (err) {
      if (err) {
        return res.status(500).json({ message: "Failed to configure PIN" });
      }

      const token = jwt.sign(
        { userId, username: DEVICE_USERNAME, role: 'user' },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ message: "PIN configured successfully", token });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/verify", (req: AnyRequest, res: Response) => {
  try {
    const { pin } = req.body;

    if (!pin || !/^[0-9]{6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 6 digits" });
    }

    const userId = DEVICE_USERID;
    db.get(`SELECT pin_hash FROM users WHERE userid = ?`, [userId], async (err, userRow: any) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!userRow || !userRow.pin_hash) {
        return res.status(404).json({ message: "PIN not configured" });
      }

      const isMatch = await bcrypt.compare(pin, userRow.pin_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const token = jwt.sign(
        { userId, username: DEVICE_USERNAME, role: 'user' },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ message: "PIN verified successfully", token });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/reset", async (req: AnyRequest, res: Response) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!currentPin || !/^[0-9]{6}$/.test(currentPin)) {
      return res.status(400).json({ message: "Current PIN must be exactly 6 digits" });
    }

    if (!newPin || !/^[0-9]{6}$/.test(newPin)) {
      return res.status(400).json({ message: "New PIN must be exactly 6 digits" });
    }

    const userId = DEVICE_USERID;
    db.get(`SELECT pin_hash FROM users WHERE userid = ?`, [userId], async (err, userRow: any) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!userRow || !userRow.pin_hash) {
        return res.status(404).json({ message: "PIN not configured" });
      }

      const isMatch = await bcrypt.compare(currentPin, userRow.pin_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid current PIN" });
      }

      const newHash = await bcrypt.hash(newPin, 10);
      db.run(`UPDATE users SET pin_hash = ? WHERE userid = ?`, [newHash, userId], function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ message: "Failed to reset PIN" });
        }

        res.json({ message: "PIN reset successfully" });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});