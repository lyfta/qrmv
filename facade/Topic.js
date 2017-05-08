/*
 * (c) 2017 Tom Engström for Lyfta
 */
define( [
	'require',
    'dojo/_base/declare',
    'quantum/_Debug',
    'quantum/Deferred',
    'quantum/class-loader',
    
    'materia/Facade',
    'materia/field-names',
    'materia/standard-fields',
    
    'materia/Search',
    'materia/search/filter/ContainsAnyObject',
    'materia/search/filter/HasAnyFieldTag'
], function(
	require,
	declare,
	_Debug,
	Deferred,
	class_loader,

	Facade,
	field_names,
	standard_fields,
	
	Search,
	filter_ContainsAnyObject,
	filter_HasAnyFieldTag
) {

	var TYPE_ID = 719619914;
	
	var FIELDS = {
		PARENT_TOPIC: field_names.get(685279786),
		BODY: 	field_names.get(683409705),
		VIDEO: 	field_names.get(991402651)
	};
	
	var Class = declare( [ Facade, _Debug ], {
	
		/**
		 * Gets topics from the feed of this record
		 * (assuming that only ones that have set this as a parent topic are listed)
		 */
		get_subtopics: function() {
			var self = this;
			var record = self.get_record();
			var broker = record.get_broker();
			var search = new Search( {
				broker: broker
			} );
			// Limit to containing current record
			search.add_parameter( new filter_ContainsAnyObject( {
				objects: [ record ]
			} ) );
			// Limit to topic type
			search.add_parameter( new filter_ContainsAnyObject( {
				field: standard_fields.TYPE,
				object_ids: [ TYPE_ID ]
			} ) );	
			
			return search.get_results();
		},
		
		get_article_categories: function() {
			var self = this;
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(error); }

			var record = self.get_record();
			var broker = record.get_broker();
			var search = new Search( {
				broker: broker
			} );
			
		    class_loader.require('qrmv/facade/Category').then( function(Category) {
				// Limit to containing current record
				search.add_parameter( new filter_ContainsAnyObject( {
					objects: [ record ]
				} ) );
				// Limit to topic type
				search.add_parameter( new filter_ContainsAnyObject( {
					field: standard_fields.TYPE,
					object_ids: [ Category.TYPE_ID ]
				} ) );
				search.get_results().then( function(results) {
					deferred.resolve(results);
				}, reject );
		    }, reject );
		    return deferred;
		}
		
	});
	
	Class.FIELDS = FIELDS;
	
	return Class;
});
