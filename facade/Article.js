/*
 * (c) 2017 Tom Engström for Lyfta
 */
define( [
	'require',
    'dojo/_base/declare',
    'quantum/_Debug',
    'quantum/Deferred',
    'quantum/class-loader',

    'materia/field-names',
    'materia/Facade',
    
    'qrmv/constants'
], function(
	require,
	declare,
	_Debug,
	Deferred,
	class_loader,
	
	field_names,
	Facade,
	
	constants
) {
	
	var TYPE_ID = 816047018;
	
	var FIELDS = {
		CATEGORY: field_names.get(87399354),
		AUTHORS: field_names.get(695794870),
		ABSTRACT: field_names.get(18927170),
		PUBLISH_DATE: field_names.get(974366681),
		LINK: field_names.get(930738054),
		JOURNAL_NAME: field_names.get(877524122),
		JOURNAL_VOLUME: field_names.get(597188070),
		JOURNAL_ISSUE: field_names.get(1074918001)
	};

	var Article = declare( [ Facade, _Debug ], {
		
		constructor: function(args) {
			var self = this;
			self.set_debug_mid('qrmv/facade/Article');
			//self.enable_debug();
			
			return;
		},
		
		get_parent_categories: function() {
			var self = this;
			var record = self.get_record();
			return record.get_common_value(FIELDS.CATEGORY);
		},

		get_parent_topic: function() {
			var self = this;
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(); };
			var record = self.get_record();
			var get_categories = self.get_parent_categories();
			class_loader.require('qrmv/facade/Topic').then( function(Topic) {
				get_categories.then_apply( function(first_category) {
					if (!first_category) {
						reject('no categories');
						return;
					}
					self._log('get_parent_topic: got category', first_category );
					first_category.get_common_value( Topic.FIELDS.PARENT_TOPIC ).then(function(parent_topics) {
						self._log('get_parent_topic: got parent topics', parent_topics );
						deferred.resolve(parent_topics[0]);
					}, reject );
				}, reject );
			}, reject );
			
			return deferred;
		}
	});
	
	Article.TYPE_ID = TYPE_ID;
	Article.FIELDS = FIELDS;
	
	return Article;
});
