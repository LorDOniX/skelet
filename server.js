#!/usr/bin/env node
var express = require('express');
var path = require('path');
var app = express();
var port = process.env.PORT || 8004;

const MAIN_PATH = "static";

// paths
app.use("/dist", express.static(path.join(__dirname, 'dist')));
app.use("/js", express.static(path.join(__dirname, 'js')));

// default
app.get('/*', function(req, res) {
	res.sendfile("./index.html");
});

console.log("Server running on the port " + port);
app.listen(port);
