const express = require('express');
const bodyParser = require('body-parser');

const app = express();

// parse application/json
app.use(bodyParser.json());

const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 9199;

const sourcesEntry = require('./faas/sourcesEntry.js');
app.all('/sources**', sourcesEntry);

const targetsEntry = require('./faas/targetsEntry.js');
app.all('/targets**', targetsEntry);

const usersEntry = require('./faas/usersEntry.js');
app.all('/users**', usersEntry);

app.listen(PORT, function() {
  console.log(`Listening on port ${PORT}...`);
});
