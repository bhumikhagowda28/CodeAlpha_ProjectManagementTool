import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({});
  const [users, setUsers] = useState([]);

  const [taskTitle, setTaskTitle] = useState({});
  const [taskDescription, setTaskDescription] = useState({});
  const [taskStatus, setTaskStatus] = useState({});
  const [taskDeadline, setTaskDeadline] = useState({});
  const [taskAssignedTo, setTaskAssignedTo] = useState({});

  const [editingTask, setEditingTask] = useState(null);

  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  const [message, setMessage] = useState("");

  // =========================
  // LOGIN / REGISTER
  // =========================

  const handleAuth = async (e) => {
    e.preventDefault();

    const url = isLogin
      ? "http://localhost:5000/api/login"
      : "http://localhost:5000/api/register";

    const body = isLogin
      ? { email, password }
      : { name, email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));

          setLoggedIn(true);
          setMessage(`Welcome, ${data.user.name}! 🎉`);

          fetchProjects(data.user.id);
          fetchUsers();
        } else {
          setMessage("Registration successful! 🎉");

          setName("");
          setEmail("");
          setPassword("");
        }
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not connect to the backend.");
    }
  };

  // =========================
  // GET USERS
  // =========================

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/users"
      );

      const data = await response.json();

      if (response.ok) {
        setUsers(data);
      }
    } catch (error) {
      setMessage("Could not load users.");
    }
  };

  // =========================
  // PROJECTS
  // =========================

  const fetchProjects = async (userId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/projects/${userId}`
      );

      const data = await response.json();

      if (response.ok) {
        setProjects(data);

        data.forEach((project) => {
          fetchTasks(project.id);
        });
      }
    } catch (error) {
      setMessage("Could not load projects.");
    }
  };

  const createProject = async (e) => {
    e.preventDefault();

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (!user) {
      setMessage("Please login again.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: projectName,
            description: projectDescription,
            created_by: user.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Project created successfully! 🎉");

        setProjectName("");
        setProjectDescription("");

        fetchProjects(user.id);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not create project.");
    }
  };

  // =========================
  // TASKS
  // =========================

  const fetchTasks = async (projectId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${projectId}`
      );

      const data = await response.json();

      if (response.ok) {
        setTasks((previousTasks) => ({
          ...previousTasks,
          [projectId]: data,
        }));

        data.forEach((task) => {
          fetchComments(task.id);
        });
      }
    } catch (error) {
      setMessage("Could not load tasks.");
    }
  };

  const createTask = async (projectId) => {
    if (!taskTitle[projectId]) {
      setMessage("Please enter a task title.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: taskTitle[projectId],
            description:
              taskDescription[projectId] || "",
            status:
              taskStatus[projectId] || "To Do",
            deadline:
              taskDeadline[projectId] || "",
            project_id: projectId,
            assigned_to:
              taskAssignedTo[projectId] || null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Task created successfully! 🎉");

        setTaskTitle((previous) => ({
          ...previous,
          [projectId]: "",
        }));

        setTaskDescription((previous) => ({
          ...previous,
          [projectId]: "",
        }));

        setTaskStatus((previous) => ({
          ...previous,
          [projectId]: "To Do",
        }));

        setTaskDeadline((previous) => ({
          ...previous,
          [projectId]: "",
        }));

        setTaskAssignedTo((previous) => ({
          ...previous,
          [projectId]: "",
        }));

        fetchTasks(projectId);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not create task.");
    }
  };

  // =========================
  // EDIT TASK
  // =========================

  const startEditingTask = (task) => {
    setEditingTask(task.id);

    setTaskTitle((previous) => ({
      ...previous,
      [task.id]: task.title,
    }));

    setTaskDescription((previous) => ({
      ...previous,
      [task.id]: task.description || "",
    }));

    setTaskStatus((previous) => ({
      ...previous,
      [task.id]: task.status,
    }));

    setTaskDeadline((previous) => ({
      ...previous,
      [task.id]: task.deadline || "",
    }));

    setTaskAssignedTo((previous) => ({
      ...previous,
      [task.id]: task.assigned_to || "",
    }));
  };

  const saveEditedTask = async (task) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${task.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: taskTitle[task.id],
            description:
              taskDescription[task.id] || "",
            status:
              taskStatus[task.id] || "To Do",
            deadline:
              taskDeadline[task.id] || "",
            assigned_to:
              taskAssignedTo[task.id] || null,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Task updated successfully! ✅");

        setEditingTask(null);

        fetchTasks(task.project_id);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not update task.");
    }
  };

  // =========================
  // DELETE TASK
  // =========================

  const deleteTask = async (
    taskId,
    projectId
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${taskId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Task deleted successfully! 🗑️");

        fetchTasks(projectId);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not delete task.");
    }
  };

  // =========================
  // COMMENTS
  // =========================

  const fetchComments = async (taskId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/comments/${taskId}`
      );

      const data = await response.json();

      if (response.ok) {
        setComments((previous) => ({
          ...previous,
          [taskId]: data,
        }));
      }
    } catch (error) {
      setMessage("Could not load comments.");
    }
  };

  const addComment = async (taskId) => {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (!user) {
      setMessage("Please login again.");
      return;
    }

    if (!commentText[taskId]?.trim()) {
      setMessage("Please enter a comment.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: commentText[taskId],
            task_id: taskId,
            user_id: user.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Comment added successfully! 💬");

        setCommentText((previous) => ({
          ...previous,
          [taskId]: "",
        }));

        fetchComments(taskId);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Could not add comment.");
    }
  };

  const toggleComments = (taskId) => {
    setShowComments((previous) => ({
      ...previous,
      [taskId]: !previous[taskId],
    }));

    fetchComments(taskId);
  };

  // =========================
  // LOGIN / LOGOUT
  // =========================

  const switchMode = () => {
    setIsLogin(!isLogin);

    setMessage("");
    setName("");
    setEmail("");
    setPassword("");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedIn(false);
    setProjects([]);
    setTasks({});
    setUsers([]);
    setComments({});
    setMessage("");
  };

  // =========================
  // AUTO LOGIN
  // =========================

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      const user = JSON.parse(savedUser);

      setLoggedIn(true);

      fetchProjects(user.id);
      fetchUsers();
    }
  }, []);

  // =========================
  // DASHBOARD
  // =========================

  if (loggedIn) {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    return (
      <div className="app">
        <div className="auth-box">

          <h1>Project Management Tool</h1>

          <h2>
            Welcome, {user.name}! 👋
          </h2>

          <p>
            Create and manage your projects
            and tasks.
          </p>

          {/* CREATE PROJECT */}

          <form onSubmit={createProject}>

            <input
              type="text"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) =>
                setProjectName(e.target.value)
              }
              required
            />

            <textarea
              placeholder="Project Description"
              value={projectDescription}
              onChange={(e) =>
                setProjectDescription(
                  e.target.value
                )
              }
            />

            <button type="submit">
              Create Project
            </button>

          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <hr />

          <h2>My Projects 📋</h2>

          {projects.length === 0 ? (
            <p>No projects created yet.</p>
          ) : (
            projects.map((project) => (
              <div
                className="project-card"
                key={project.id}
              >

                <h3>{project.name}</h3>

                <p>
                  {project.description ||
                    "No description provided."}
                </p>

                <h4>Tasks 📝</h4>

                {/* CREATE TASK */}

                <input
                  type="text"
                  placeholder="Task Title"
                  value={
                    taskTitle[project.id] || ""
                  }
                  onChange={(e) =>
                    setTaskTitle(
                      (previous) => ({
                        ...previous,
                        [project.id]:
                          e.target.value,
                      })
                    )
                  }
                />

                <textarea
                  placeholder="Task Description"
                  value={
                    taskDescription[
                      project.id
                    ] || ""
                  }
                  onChange={(e) =>
                    setTaskDescription(
                      (previous) => ({
                        ...previous,
                        [project.id]:
                          e.target.value,
                      })
                    )
                  }
                />

                <select
                  value={
                    taskStatus[
                      project.id
                    ] || "To Do"
                  }
                  onChange={(e) =>
                    setTaskStatus(
                      (previous) => ({
                        ...previous,
                        [project.id]:
                          e.target.value,
                      })
                    )
                  }
                >
                  <option value="To Do">
                    To Do
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>
                </select>

                <input
                  type="date"
                  value={
                    taskDeadline[
                      project.id
                    ] || ""
                  }
                  onChange={(e) =>
                    setTaskDeadline(
                      (previous) => ({
                        ...previous,
                        [project.id]:
                          e.target.value,
                      })
                    )
                  }
                />

                {/* ASSIGN TASK */}

                <select
                  value={
                    taskAssignedTo[
                      project.id
                    ] || ""
                  }
                  onChange={(e) =>
                    setTaskAssignedTo(
                      (previous) => ({
                        ...previous,
                        [project.id]:
                          e.target.value,
                      })
                    )
                  }
                >
                  <option value="">
                    Assign to user
                  </option>

                  {users.map((registeredUser) => (
                    <option
                      key={registeredUser.id}
                      value={registeredUser.id}
                    >
                      {registeredUser.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    createTask(project.id)
                  }
                >
                  Add Task
                </button>

                <hr />

                {/* TASK LIST */}

                {tasks[project.id]?.length >
                0 ? (
                  tasks[project.id].map(
                    (task) => (
                      <div
                        className="task-card"
                        key={task.id}
                      >

                        {/* EDIT MODE */}

                        {editingTask ===
                        task.id ? (
                          <>
                            <input
                              type="text"
                              value={
                                taskTitle[
                                  task.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setTaskTitle(
                                  (previous) => ({
                                    ...previous,
                                    [task.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                            />

                            <textarea
                              value={
                                taskDescription[
                                  task.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setTaskDescription(
                                  (previous) => ({
                                    ...previous,
                                    [task.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                            />

                            <select
                              value={
                                taskStatus[
                                  task.id
                                ] || "To Do"
                              }
                              onChange={(e) =>
                                setTaskStatus(
                                  (previous) => ({
                                    ...previous,
                                    [task.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                            >
                              <option value="To Do">
                                To Do
                              </option>

                              <option value="In Progress">
                                In Progress
                              </option>

                              <option value="Completed">
                                Completed
                              </option>
                            </select>

                            <input
                              type="date"
                              value={
                                taskDeadline[
                                  task.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setTaskDeadline(
                                  (previous) => ({
                                    ...previous,
                                    [task.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                            />

                            {/* EDIT ASSIGNMENT */}

                            <select
                              value={
                                taskAssignedTo[
                                  task.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setTaskAssignedTo(
                                  (previous) => ({
                                    ...previous,
                                    [task.id]:
                                      e.target
                                        .value,
                                  })
                                )
                              }
                            >
                              <option value="">
                                Unassigned
                              </option>

                              {users.map(
                                (
                                  registeredUser
                                ) => (
                                  <option
                                    key={
                                      registeredUser.id
                                    }
                                    value={
                                      registeredUser.id
                                    }
                                  >
                                    {
                                      registeredUser.name
                                    }
                                  </option>
                                )
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                saveEditedTask(
                                  task
                                )
                              }
                            >
                              Save Changes
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingTask(
                                  null
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {/* NORMAL TASK VIEW */}

                            <h4>
                              {task.title}
                            </h4>

                            <p>
                              {task.description ||
                                "No description."}
                            </p>

                            <p>
                              <strong>
                                Status:
                              </strong>{" "}
                              {task.status}
                            </p>

                            <p>
                              <strong>
                                Deadline:
                              </strong>{" "}
                              {task.deadline ||
                                "No deadline"}
                            </p>

                            <p>
                              <strong>
                                Assigned to:
                              </strong>{" "}
                              {task.assigned_user_name ||
                                "Unassigned"}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                startEditingTask(
                                  task
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteTask(
                                  task.id,
                                  project.id
                                )
                              }
                            >
                              Delete
                            </button>

                            {/* COMMENTS */}

                            <button
                              type="button"
                              onClick={() =>
                                toggleComments(
                                  task.id
                                )
                              }
                            >
                              {showComments[
                                task.id
                              ]
                                ? "Hide Comments"
                                : "Comments 💬"}
                            </button>

                            {showComments[
                              task.id
                            ] && (
                              <div
                                style={{
                                  marginTop:
                                    "15px",
                                  padding:
                                    "10px",
                                  borderTop:
                                    "1px solid #ddd",
                                }}
                              >

                                <h4>
                                  Task Comments 💬
                                </h4>

                                {comments[
                                  task.id
                                ]?.length > 0 ? (
                                  comments[
                                    task.id
                                  ].map(
                                    (
                                      comment
                                    ) => (
                                      <div
                                        key={
                                          comment.id
                                        }
                                        style={{
                                          marginBottom:
                                            "10px",
                                        }}
                                      >
                                        <strong>
                                          {
                                            comment.user_name
                                          }
                                        </strong>

                                        <p>
                                          {
                                            comment.comment
                                          }
                                        </p>
                                      </div>
                                    )
                                  )
                                ) : (
                                  <p>
                                    No comments
                                    yet.
                                  </p>
                                )}

                                <textarea
                                  placeholder="Write a comment..."
                                  value={
                                    commentText[
                                      task.id
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    setCommentText(
                                      (previous) => ({
                                        ...previous,
                                        [task.id]:
                                          e.target
                                            .value,
                                      })
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    addComment(
                                      task.id
                                    )
                                  }
                                >
                                  Add Comment
                                </button>

                              </div>
                            )}
                          </>
                        )}

                      </div>
                    )
                  )
                ) : (
                  <p>No tasks yet.</p>
                )}

              </div>
            ))
          )}

          <br />

          <button onClick={logout}>
            Logout
          </button>

        </div>
      </div>
    );
  }

  // =========================
  // LOGIN PAGE
  // =========================

  return (
    <div className="app">
      <div className="auth-box">

        <h1>Project Management Tool</h1>

        <h2>
          {isLogin
            ? "Login"
            : "Create Account"}
        </h2>

        <p>
          {isLogin
            ? "Login to manage your projects"
            : "Register to get started"}
        </p>

        <form onSubmit={handleAuth}>

          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button type="submit">
            {isLogin
              ? "Login"
              : "Register"}
          </button>

        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        <p className="switch-text">

          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            className="switch-button"
            onClick={switchMode}
          >
            {isLogin
              ? "Register"
              : "Login"}
          </button>

        </p>

      </div>
    </div>
  );
}

export default App;
