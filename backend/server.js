const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const db = new Database("projectmanager.db");

// =========================
// DATABASE TABLES
// =========================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'To Do',
    deadline TEXT,
    project_id INTEGER,
    assigned_to INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment TEXT NOT NULL,
    task_id INTEGER,
    user_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Add assigned_to to existing tasks table if it does not already exist.
try {
  db.prepare(
    "ALTER TABLE tasks ADD COLUMN assigned_to INTEGER"
  ).run();
} catch (error) {
  // Column already exists, so nothing needs to be done.
}

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.send("Project Management Tool Backend is running!");
});

// =========================
// REGISTER
// =========================

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Please fill all fields.",
    });
  }

  try {
    const existingUser = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
      )
      .run(name, email, hashedPassword);

    res.json({
      message: "Registration successful!",
      user: {
        id: result.lastInsertRowid,
        name,
        email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed.",
    });
  }
});

// =========================
// LOGIN
// =========================

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      "project_manager_secret_2026",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed.",
    });
  }
});

// =========================
// GET ALL USERS
// =========================

app.get("/api/users", (req, res) => {
  try {
    const users = db
      .prepare(
        "SELECT id, name, email FROM users ORDER BY name ASC"
      )
      .all();

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Could not load users.",
    });
  }
});

// =========================
// CREATE PROJECT
// =========================

app.post("/api/projects", (req, res) => {
  const { name, description, created_by } = req.body;

  if (!name || !created_by) {
    return res.status(400).json({
      message: "Project name and creator are required.",
    });
  }

  try {
    const result = db
      .prepare(
        "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)"
      )
      .run(name, description || "", created_by);

    res.json({
      message: "Project created successfully!",
      project: {
        id: result.lastInsertRowid,
        name,
        description: description || "",
        created_by,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not create project.",
    });
  }
});

// =========================
// GET PROJECTS FOR USER
// =========================

app.get("/api/projects/:userId", (req, res) => {
  try {
    const projects = db
      .prepare(
        "SELECT * FROM projects WHERE created_by = ? ORDER BY id DESC"
      )
      .all(req.params.userId);

    res.json(projects);
  } catch (error) {
    res.status(500).json({
      message: "Could not load projects.",
    });
  }
});

// =========================
// CREATE TASK
// =========================

app.post("/api/tasks", (req, res) => {
  const {
    title,
    description,
    status,
    deadline,
    project_id,
    assigned_to,
  } = req.body;

  if (!title || !project_id) {
    return res.status(400).json({
      message: "Task title and project are required.",
    });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO tasks
        (title, description, status, deadline, project_id, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        description || "",
        status || "To Do",
        deadline || "",
        project_id,
        assigned_to || null
      );

    res.json({
      message: "Task created successfully!",
      task: {
        id: result.lastInsertRowid,
        title,
        description: description || "",
        status: status || "To Do",
        deadline: deadline || "",
        project_id,
        assigned_to: assigned_to || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not create task.",
    });
  }
});

// =========================
// GET TASKS FOR PROJECT
// =========================

app.get("/api/tasks/:projectId", (req, res) => {
  try {
    const tasks = db
      .prepare(
        `SELECT
          tasks.*,
          users.name AS assigned_user_name
        FROM tasks
        LEFT JOIN users
          ON tasks.assigned_to = users.id
        WHERE tasks.project_id = ?
        ORDER BY tasks.id DESC`
      )
      .all(req.params.projectId);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Could not load tasks.",
    });
  }
});

// =========================
// UPDATE TASK
// =========================

app.put("/api/tasks/:taskId", (req, res) => {
  const {
    title,
    description,
    status,
    deadline,
    assigned_to,
  } = req.body;

  try {
    const result = db
      .prepare(
        `UPDATE tasks
         SET title = ?,
             description = ?,
             status = ?,
             deadline = ?,
             assigned_to = ?
         WHERE id = ?`
      )
      .run(
        title,
        description || "",
        status || "To Do",
        deadline || "",
        assigned_to || null,
        req.params.taskId
      );

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    res.json({
      message: "Task updated successfully!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not update task.",
    });
  }
});

// =========================
// DELETE TASK
// =========================

app.delete("/api/tasks/:taskId", (req, res) => {
  try {
    db.prepare(
      "DELETE FROM comments WHERE task_id = ?"
    ).run(req.params.taskId);

    const result = db
      .prepare("DELETE FROM tasks WHERE id = ?")
      .run(req.params.taskId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    res.json({
      message: "Task deleted successfully!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not delete task.",
    });
  }
});

// =========================
// GET COMMENTS FOR TASK
// =========================

app.get("/api/comments/:taskId", (req, res) => {
  try {
    const comments = db
      .prepare(
        `SELECT
          comments.*,
          users.name AS user_name
        FROM comments
        LEFT JOIN users
          ON comments.user_id = users.id
        WHERE comments.task_id = ?
        ORDER BY comments.id ASC`
      )
      .all(req.params.taskId);

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: "Could not load comments.",
    });
  }
});

// =========================
// ADD COMMENT
// =========================

app.post("/api/comments", (req, res) => {
  const { comment, task_id, user_id } = req.body;

  if (!comment || !task_id || !user_id) {
    return res.status(400).json({
      message: "Comment, task and user are required.",
    });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO comments
        (comment, task_id, user_id)
        VALUES (?, ?, ?)`
      )
      .run(comment, task_id, user_id);

    res.json({
      message: "Comment added successfully!",
      comment: {
        id: result.lastInsertRowid,
        comment,
        task_id,
        user_id,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not add comment.",
    });
  }
});

// =========================
// START SERVER
// =========================

app.listen(5000, () => {
  console.log(
    "Server running on http://localhost:5000"
  );
});
