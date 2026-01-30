const express = require('express');
const app = express();
const port = 8080;

app.use(express.json());

// get data from the login
app.post('/login', function (req, res) {
    console.log("Login request received");
    console.log(req.body.name);
    res.end();
});

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Hello World from Express!');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
