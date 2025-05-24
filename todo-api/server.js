const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: ['https://your-frontend-domain.com', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());

// MongoDB Connection with error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Add error handler for MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  settings: {
    defaultView: { type: String, enum: ['day', 'week', 'month'], default: 'month' },
    defaultCategory: { type: String, default: 'default' },
    theme: { type: String, default: 'light' },
    gradient: {
      isEnabled: { type: Boolean, default: true },
      startColor: { type: String, default: '#4158D0' },
      middleColor: { type: String, default: '#C850C0' },
      endColor: { type: String, default: '#FFCC70' }
    }
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Authentication Routes
app.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', { username: req.body.username });
    const { username, password, gradient } = req.body;

    if (!username || !password) {
      console.log('Registration failed: Missing credentials');
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Validate username and password
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('Registration failed: Username already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password and create user with gradient settings
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword,
      settings: {
        defaultView: 'month',
        defaultCategory: 'default',
        theme: 'light',
        gradient: gradient || {
          isEnabled: true,
          startColor: '#4158D0',
          middleColor: '#C850C0',
          endColor: '#FFCC70'
        }
      },
      categories: [{ name: 'default', color: '#808080' }],
      labels: []
    });

    // Save the user
    const savedUser = await user.save();
    console.log('User created successfully:', { userId: savedUser._id });

    // Initialize statistics for new user
    const statistics = new Statistics({
      userId: savedUser._id,
      completionRate: 0,
      streak: 0,
      totalTasks: 0,
      completedTasks: 0,
      categoryDistribution: new Map()
    });
    await statistics.save();
    console.log('Statistics initialized for user:', { userId: savedUser._id });

    // Return user settings along with the registration success message
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: savedUser._id,
      settings: savedUser.settings
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
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
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ 
      message: 'Login successful', 
      token, 
      userId: user._id,
      settings: user.settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/auth/status', authenticateToken, (req, res) => {
  res.json({ isAuthenticated: true, user: req.user });
});

app.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logged out successfully' });
});

// Task Routes
app.post('/tasks', authenticateToken, async (req, res) => {
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

app.get('/tasks', authenticateToken, async (req, res) => {
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

app.put('/tasks/:id', authenticateToken, async (req, res) => {
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

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
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
app.get('/statistics', authenticateToken, async (req, res) => {
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
app.get('/user/settings', authenticateToken, async (req, res) => {
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

app.put('/user/settings', authenticateToken, async (req, res) => {
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
app.get('/calendar/tasks', authenticateToken, async (req, res) => {
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
app.get('/tasks/reminders', authenticateToken, async (req, res) => {
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

// Add a new endpoint to update gradient settings
app.put('/user/gradient', authenticateToken, async (req, res) => {
  try {
    const { gradient } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.settings.gradient = {
      ...user.settings.gradient,
      ...gradient
    };

    await user.save();

    res.json({
      message: 'Gradient settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Gradient update error:', error);
    res.status(500).json({ 
      message: 'Server error while updating gradient', 
      error: error.message 
    });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
