const express = require('express');
const path = require('path');
const config = require('./config/config.js');

const app = express();
const port = config.port;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Discord Bot is Running 🔥');
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
