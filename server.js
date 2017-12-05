#!/usr/bin/env node
var express = require('express');
var path = require('path');
var app = express();
var port = process.env.PORT || 8001;

const MAIN_PATH = "static";

// paths
app.use("/dist", express.static(path.join(__dirname, 'dist')));

// default
app.get('/*', function(req, res) {
	res.sendfile(MAIN_PATH + '/index.html');
});

console.log("Server running on the port " + port);
app.listen(port);
