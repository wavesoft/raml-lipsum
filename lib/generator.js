
var ramlParser = require('raml-1-parser');
var loremIpsum = require('lorem-ipsum');
var RandExp = require('randexp');

var RAMLGenerator = function( ramlPath ) {

	// Load RAML path
	var raml = ramlParser.loadApiSync(ramlPath);
	var TYPE_MAP = {};
	raml.types().forEach(function(type) {
		TYPE_MAP[type.name()] = type;
	});

	/**
	 * Resolves a type name to a type object
	 */
	function getTypeRef(typeName) {
		if (TYPE_MAP[typeName] === undefined) {
			throw Error('Unknown type name "' + typeName + '" requested');
		}
		return TYPE_MAP[typeName];
	}

	/**
	 * Removes the array ending from the type name
	 */
	function normalizeTypeName(typeName) {
		if (typeName.endsWith('[]')) {
			return typeName.substr(0, typeName.length-2);
		} else {
			return typeName;
		}
	}

	/**
	 * Reverse-compute a regular expression to a random string that validates it
	 */
	function generatePattern(pattern) {

		// Limit regular expression expansion and generate
		var randExp = new RandExp(pattern);
		randExp.max = Math.round(Math.random()*10)+5;
		var result = randExp.gen();

		// Make things a bit more prettier, by using lorem impsum to arrange
		// letters into a pronouncable way
		var reasonableString = loremIpsum({count: 50, units: 'words'}).replace(/ /g, '');
		var i = 0;
		return result.replace(/[a-z]/ig, function(m) {
			if (i>=reasonableString.length) i=0;
			return reasonableString[i++];
		});

	}

	/**
	 * Return ture if the give type name is something the native generator can produce
	 */
	function isNativeTypeName(typeName) {
		return [
			'integer',
			'number',
			'string',
			'boolean',
			'null',
			'datetime',
			'datetime-only',
			'time-only',
			'date-only',
			'file'
		].indexOf(typeName) >= 0;
	}

	/**
	 * Return true if the given type object is (or is a subclass) of a native type
	 */
	function isNative(type) {
		var typeNames = type.type();
		return typeNames.every(function (typeName) {
			typeName = normalizeTypeName(typeName);
			if (typeName === 'object') {
				return false;
			}
			if (isNativeTypeName(typeName)) {
				return true;
			}
			if (isNative(getTypeRef(typeName))) {
				return true;
			}
			return false;
		});
	}

	/**
	 * Generate random data for the given native type
	 */
	function randomDataForNative(type) {
		var d = new Date();
		var typeName = normalizeTypeName(type.type()[0]);
		switch (typeName) {
			case 'number':
			case 'integer':
				var min = type.minimum() || 0;
				var max = type.maximum() || 0xFFFF;
				var num = Math.random() * (max - min) + min;
				if (typeName === 'integer') {
					return Math.round(num);
				} else {
					return num;
				}
			case 'string':
				var enumValues = type.enum();
				var pattern = type.pattern();
				if (enumValues && enumValues.length) {
					return enumValues[Math.floor(Math.random()*enumValues.length)];
				} else if (pattern) {
					return generatePattern(pattern);
				} else {
					return loremIpsum({count: 1, units: 'words'});
				}
			case 'boolean':
				return !!(Math.random() > 0.5);
			case 'null':
				return null;
			case 'datetime':
			case 'datetime-only':
				return d;
			case 'time-only':
				return d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
			case 'date-only':
				return d.getDay()+'/'+d.getMonth()+'/'+d.getFullYear();
			case 'file':
				var paths = loremIpsum({count: Math.round(Math.random()*5)+1, units: 'words'})
				return '/'+paths.replace(' ', '/');
			default:
				throw new Error('Unhandled data type '+typeName);
		}
	}

	/**
	 * Walk up the subclass tree and return the root type class
	 */
	function getNativeSuperClass(type) {
		var types = type.type();

		// Test if the item itself is the native
		var isNative = types.every(function (typeName) {
			return isNativeTypeName(normalizeTypeName(typeName));
		});
		if (isNative) return type;

		// Otherwise get the super class
		return getNativeSuperClass(getTypeRef(normalizeTypeName(types[0])));
	}

	/**
	 * Return true if the type is an object (or is a subclass of an object)
	 */
	function isObject(type) {
		var types = type.type();
		if (types.indexOf('object') >= 0) {
			return true;
		}
		return types.every(function(typeName) {
			typeName = normalizeTypeName(typeName);

			// First test for native
			if (isNativeTypeName(typeName)) {
				return false;
			}

			// then test for object refs
			var typeRef = getTypeRef(typeName);
			return isObject(typeRef);

		});
	}

	/**
	 * Returns true if the type is array
	 */
	function isArray(type) {
		if (type.type().indexOf('array') >= 0) {
			return true;
		} else {
			return type.type()[0].endsWith('[]');
		}
	}

	/**
	 * Return an object randomly generated from the given type
	 */
	function randomDataForObject(type, extend) {
		var object = extend || {};

		// First populate object with super object types
		// (we assume that the entire chain of objects are of type 'objects')
		// since the isObject function will only then return true
		type.type().forEach(function (typeName) {
			typeName = normalizeTypeName(typeName);
			if (typeName === 'object') return;
			randomDataForObject(getTypeRef(typeName), object);
		});

		// There is a chance we are called from `randomArrayDataFor`, meaning that
		// the base object is an array. In this case, this object has no properties.
		if (isArray(type)) {
			return object;
		}

		// Then populate our properties
		type.properties().forEach(function (prop) {
			object[prop.name()] = randomDataFor(prop);
		});

		return object;
	}

	/**
	 * Return a single object instance (even though we pass an array type to it)
	 */
	function randomSingleDataFor(type) {
		if (isNative(type)) {
			return randomDataForNative(getNativeSuperClass(type));
		} else if (isObject(type)) {
			return randomDataForObject(type);
		} else {
			throw new Error('Uhandled object type: [' + type.type().join(', ') + ']');
		}
	}

	/**
	 * Return an array of random objects
	 */
	function randomArrayDataFor(type) {
		var minItems = type.minItems() || 0;
		var maxItems = type.maxItems() || 10;
		var rand = Math.round(Math.random() * (maxItems - minItems)) + minItems;

		return Array(rand, null).map(function() {
			return randomSingleDataFor(type);
		});
	}

	/**
	 * Entry point function to generate data fro the given type
	 */
	function randomDataFor(type) {
		if (isArray(type)) {
			return randomArrayDataFor(type);
		} else {
			return randomSingleDataFor(type);
		}
	}

	/**
	 * Expose type names
	 */
	this.typeNames = Object.keys(TYPE_MAP);

	/**
	 * Expose random data generator
	 */
	this.generate = function(typeName) {
		var type = getTypeRef(typeName);
		return randomDataFor(type);
	}

};
