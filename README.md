# raml-lipsum

Generates random data from RAML type specifications

# Usage

You can use `raml-lipsum` either from the command-line, or as a node library.

From the command-line:

```bash
~$ raml-lipsum path/to/file.raml TypeName > sample-data.json
```

As a library:

```js
var RAMLGenerator = require('raml-lipsum');

// Load RAML file and create a generator
var generator = new RAMLGenerator('/path/to/file.raml');

// Generate some data for the given type
var data = generator.generate('TypeName');
console.log(JSON.stringify(data));
```

# Installation

project: `npm install raml-lipsum --save`

global: `npm install raml-lipsum -g`

# License

Copyright (c) 2016 Ioannis Charalampidis

MIT (http://opensource.org/licenses/mit-license.php)
