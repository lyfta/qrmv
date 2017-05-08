/*
 * (c) 2017 Sam Engström for Lyfta
 */
define( [
    'dojo/_base/declare',
    'qrmv/facade/Article',
    'materia/field-names'
], function(
	declare,
	Article,
	field_names
) {
	
	var TYPE_ID = 986124750;

	var FIELDS = {
		ISBN: field_names.get(329739309)
	};

	var Class = declare( [ Article ], {
	} );

	Class.TYPE_ID = TYPE_ID;
	Class.FIELDS = FIELDS;
	
	return Class;
} );
