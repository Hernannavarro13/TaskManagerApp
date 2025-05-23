const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  settings: {
    defaultView: { type: String, enum: ['day', 'week', 'month'], default: 'month' },
    defaultCategory: { type: String, default: 'default' },
    theme: { type: String, default: 'light' }
  },
  categories: [{ 
    name: String, 
    color: String 
  }],
  labels: [{ 
    name: String, 
    color: String 
  }],
  createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, default: 'default' },
  labels: [String],
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
    interval: Number,
    endDate: Date,
    lastGenerated: Date
  },
  reminder: {
    enabled: { type: Boolean, default: false },
    time: Date,
    notified: { type: Boolean, default: false }
  },
  progress: { type: Number, default: 0 },
  parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const statisticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completionRate: Number,
  streak: Number,
  totalTasks: Number,
  completedTasks: Number,
  categoryDistribution: Map,
  lastUpdated: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Statistics = mongoose.model('Statistics', statisticsSchema);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Access denied, token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

// Authentication Routes
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    // Initialize statistics for new user
    const statistics = new Statistics({
      userId: user._id,
      completionRate: 0,
      streak: 0,
      totalTasks: 0,
      completedTasks: 0,
      categoryDistribution: new Map()
    });
    await statistics.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    res.json({ message: 'Login successful', token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Task Routes
app.post('/tasks', verifyToken, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      userId: req.user.userId
    });
    await task.save();

    // Handle recurring task creation
    if (task.recurrence && task.recurrence.type !== 'none') {
      await generateRecurringTasks(task);
    }

    await updateStatistics(req.user.userId);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/tasks', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, category, priority, completed, search, labels } = req.query;
    let query = { userId: req.user.userId };

    if (startDate && endDate) {
      query.dueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (completed !== undefined) query.completed = completed === 'true';
    if (labels) {
      const labelArray = labels.split(',');
      query.labels = { $in: labelArray };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { ...req.body, completedAt: req.body.completed ? new Date() : null },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    await updateStatistics(req.user.userId);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    await updateStatistics(req.user.userId);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Statistics Routes
app.get('/statistics', verifyToken, async (req, res) => {
  try {
    let stats = await Statistics.findOne({ userId: req.user.userId });
    if (!stats) {
      stats = await initializeStatistics(req.user.userId);
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Settings Routes
app.get('/user/settings', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({
      settings: user.settings,
      categories: user.categories,
      labels: user.labels
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/user/settings', verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        settings: req.body.settings,
        categories: req.body.categories,
        labels: req.body.labels
      },
      { new: true }
    );
    res.json({
      settings: user.settings,
      categories: user.categories,
      labels: user.labels
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Calendar Routes
app.get('/calendar/tasks', verifyToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const tasks = await Task.find({
      userId: req.user.userId,
      dueDate: { $gte: startDate, $lte: endDate }
    }).sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reminder Routes
app.get('/tasks/reminders', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      userId: req.user.userId,
      'reminder.enabled': true,
      'reminder.time': { $lte: now },
      'reminder.notified': false,
      completed: false
    });

    // Mark reminders as notified
    await Promise.all(tasks.map(task => {
      task.reminder.notified = true;
      return task.save();
    }));

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper Functions
async function generateRecurringTasks(task) {
  const { recurrence } = task;
  if (!recurrence || recurrence.type === 'none') return;

  const intervals = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365
  };

  const daysToGenerate = Math.min(
    Math.floor((recurrence.endDate - task.dueDate) / (1000 * 60 * 60 * 24)),
    90 // Maximum 90 days of recurring tasks at a time
  );

  const baseDueDate = new Date(task.dueDate);
  const tasks = [];

  for (let i = 1; i <= daysToGenerate; i++) {
    const newDueDate = new Date(baseDueDate);
    newDueDate.setDate(baseDueDate.getDate() + (i * intervals[recurrence.type] * recurrence.interval));

    if (newDueDate > recurrence.endDate) break;

    const newTask = new Task({
      ...task.toObject(),
      _id: new mongoose.Types.ObjectId(),
      dueDate: newDueDate,
      parentTaskId: task._id,
      completed: false,
      completedAt: null,
      reminder: {
        ...task.reminder,
        notified: false
      }
    });

    tasks.push(newTask);
  }

  await Task.insertMany(tasks);
  task.recurrence.lastGenerated = new Date();
  await task.save();
}

// Helper function to update statistics
async function updateStatistics(userId) {
  const tasks = await Task.find({ userId });
  const completedTasks = tasks.filter(task => task.completed);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const categoryDistribution = new Map();
  tasks.forEach(task => {
    const category = task.category || 'default';
    categoryDistribution.set(category, (categoryDistribution.get(category) || 0) + 1);
  });

  // Calculate streak
  const streak = await calculateStreak(userId);

  await Statistics.findOneAndUpdate(
    { userId },
    {
      completionRate,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      categoryDistribution,
      streak,
      lastUpdated: new Date()
    },
    { upsert: true }
  );
}

async function calculateStreak(userId) {
  const tasks = await Task.find({
    userId,
    completed: true,
    completedAt: { $exists: true }
  }).sort({ completedAt: -1 });

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < tasks.length; i++) {
    const taskDate = new Date(tasks[i].completedAt);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate - taskDate) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      currentDate = taskDate;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

async function initializeStatistics(userId) {
  const statistics = new Statistics({
    userId,
    completionRate: 0,
    streak: 0,
    totalTasks: 0,
    completedTasks: 0,
    categoryDistribution: new Map()
  });
  return statistics.save();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
