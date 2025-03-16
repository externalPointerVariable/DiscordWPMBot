const express = require('express');
const path = require('path');
const config = require('./config/config.js');
const { spawn } = require('child_process');

const server = express();
const port = config.port;

server.use(express.static(path.join(__dirname, 'public')));

server.get('/', (req, res) => {
  res.send('Discord Bot is Running 🔥');
});

server.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

const botProcess = spawn('node', ['src/index.js'], { stdio: 'inherit' });

botProcess.on('exit', (code) => {
  console.log(`Bot process exited with code ${code}`);
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
