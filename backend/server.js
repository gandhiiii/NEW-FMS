const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();
require('./config/db')();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/gate', require('./routes/gate'));
app.use('/api/ambulance', require('./routes/ambulance'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/problems', require('./routes/problems'));
app.use('/api/floor-checklist', require('./routes/floorChecklist'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

require('./socket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
