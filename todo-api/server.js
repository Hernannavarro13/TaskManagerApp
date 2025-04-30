const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = 'todos.json';

// Load todos from file
function loadTodos() {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

// Save todos to file
function saveTodos(todos) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2));
}

// GET all todos
app.get('/todos', (req, res) => {
    const todos = loadTodos();
    res.json(todos);
});

// PUT to overwrite all todos
app.put('/todos', (req, res) => {
    const todos = req.body;
    saveTodos(todos);
    res.json({ message: 'Todos saved successfully' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
