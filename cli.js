
var Generator = require('./lib/generator.js');

if (process.argv.length < 2) {
	console.error('Usage: node generate.js [file.raml] [type]');
	process.exit(1);
} else {
	console.log(JSON.stringify(data, null, '  '));
}
