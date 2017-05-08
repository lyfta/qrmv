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

	var Class = declare( [ Facade, _Debug ], {
	
		constructor: function(args) {
			var self = this;
			self.set_debug_mid('qrmv/facade/Category');
			//self.enable_debug();
			
			return;
		},
		
		get_articles: function() {
			var self = this;
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(error); }
			var record = self.get_record();
			var broker = record.get_broker();
			
			class_loader.require_all( [
				'qrmv/facade/Article',
				'qrmv/facade/Book'
			] ).then_apply( function(
				Article,
				Book
			) {
				var search = new Search( {
					broker: broker
				} );

				// Limit to containing current record
				search.add_parameter( new filter_ContainsAnyObject( {
					objects: [ record ]
				} ) );

				// Limit to article type
				search.add_parameter( new filter_ContainsAnyObject( {
					field: standard_fields.TYPE,
					object_ids: [ Article.TYPE_ID, Book.TYPE_ID ]
				} ) );	

				search.get_results().then( function(results) {
					deferred.resolve(results);
				}, reject );
			}, reject );

			return deferred;
		}
		
	});
	
	Class.TYPE_ID = 1057813897;
	
	return Class;
});
