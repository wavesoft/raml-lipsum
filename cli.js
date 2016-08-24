#!/usr/bin/env node

var Generator = require('./lib/generator.js');

if (process.argv.length < 4) {
	console.error('Usage: node generate.js [file.raml] [type]');
	process.exit(1);
} else {
	var generator = new Generator(process.argv[2]);
	console.log(JSON.stringify(generator.generate(process.argv[3]), null, '  '));
}
