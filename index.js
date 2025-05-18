const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");

const { initializeDatabase } = require("./db.connect/db.connect");
const User = require("./models/user.model");
const Task = require("./models/task.model");
const Team = require("./models/team.model");
const Project = require("./models/project.model");
const Tags = require("./models/tag.model");

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

initializeDatabase();

const JWT_SECRET = "your_jwt_secret";

const verifyJWT = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(402).json({ message: "Invalid token." });
  }
};

app.get("/", (req, res) => {
  res.send("Hello Backend Start");
});

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existUser = await User.findOne({ email });
    if (existUser) {
      res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(200).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Signup error", error);
    res
      .status(500)
      .json({ error: "Something went wrong. Please try again later." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //Check if user exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    //compare password match
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    //Generate JWT token
    const token = jwt.sign({ userId: user._id }, "your_jwt_secret", {
      expiresIn: "24h",
    });
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/auth/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findOne(req.user.userId).select("-password __v");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users", async() => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (error) {
    res.status(500).json({error : "Failed to fetch users"})
  }
})

app.post("/tasks", async (req, res) => {
  try {
    const { name, project, team, owner, timeToComplete, createdAt } = req.body;

    if (!name || !project || !team || !owner || !timeToComplete) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(project) ||
      !mongoose.Types.ObjectId.isValid(team) ||
      !mongoose.Types.ObjectId.isValid(owner)
    ) {
      return res.status(400).json({ error: "Invalid ObjectId" });
    }

    const task = await Task.create(req.body);
    await task.populate(["project", "team", "owner"]);
    res.status(201).json({ message: "Task created successfully", task });


  } catch (error) {
    res.status(500).json({ error: "Failed to add task" });
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const task = await Task.find(req.query)
      .populate("owners")
      .populate("project")
      .populate("team")
      .exec();
    if (task.length != 0) {
      res.json(task);
    } else {
      res.status(404).json({ error: "No task found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

app.patch("/tasks/:id", async (req, res) => {
  try {
    const updateTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (updateTask) {
      res
        .status(200)
        .json({ message: "Task update successfully", task: updateTask });
    } else {
      res.status(404).json({ error: "task does not exist" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const del = await Task.findByIdAndDelete(req.params.id);
    if (del) {
      res.status(200).json({ message: "Task delete successfully." });
    }
  } catch (error) {
    res.status(404).json({ error: `Task id ${req.params.id} not found.` });
  }
});

//Teams
app.post("/teams", async (req, res) => {
  try {
    const team = await new Team(req.body).save();
    res.status(200).json({ message: "Team created successfully", team: team });
  } catch (error) {
    res.status(500).json({ error: "Failed to add team" });
  }
});

app.get("/teams", async (req, res) => {
  try {
    const team = await Team.find();
    if (team.length != 0) {
      res.json(team);
    } else {
      res.status(404).json({ error: "Team does not exist" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

//Projects
app.post("/projects", async (req, res) => {
  try {
    const project = await new Project(req.body).save();
    res
      .status(200)
      .json({ message: "Project added successfully", project: project });
  } catch (error) {
    res.status(404).json({ error: "Failed to add project" });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const project = await Project.find();
    if (project.length != 0) {
      res.json(project);
    } else {
      res.status(404).json({ error: "No project found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

//Tags
app.post("/tags", async (req, res) => {
  try {
    const tags = await new Tags(req.body).save();
    res.status(200).json({ message: "Tags added successfully", tags: tags });
  } catch (error) {
    res.status(404).json({ error: "Failed to add tags" });
  }
});

app.get("/tags", async (req, res) => {
  try {
    const tags = await Tags.find();
    if (tags.length != 0) {
      res.json(tags);
    } else {
      res.status(404).json({ error: "Tags not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

//Reporting
const getLastWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
};
app.get("/report/last-week", async (req, res) => {
  try {
    const tasks = await Task.find({
      status: "Completed",
      completedAt: { $gte: getLastWeek() },
    });
    res
      .status(200)
      .json({ message: "Task completed in last week", tasks: tasks });
  } catch (error) {
    res.status(404).json({ error: "failed to fetch last week completed data" });
  }
});

app.get("/report/pending", async (req, res) => {
  try {
    const tasks = await Task.find({ status: { $ne: "Completed" } });

    const total = tasks.reduce(
      (accu, curr) => accu + (curr.timeToComplete || 0),
      0
    );
    res.status(200).json({ message: "Task pending work in days", total });
  } catch (error) {
    res.status(404).json({ error: "failed to fetch pending work" });
  }
});

app.get("/report/closed-tasks", async (req, res) => {
  try {
    const tasks = await Task.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: {
            team: "$team",
            owner: "$owner",
            project: "$project",
          },
          closedTasksCount: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          team: "$_id.team",
          owner: "$_id.owner",
          project: "$_id.project",
          closedTasksCount: 1,
        },
      },
    ]);
    res.status(200).json({
      message: "Closed task counts grouped by team, owner, and project",
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate closed tasks report" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
