/* (c) 2017 Sam Engström for Lyfta
*  (c) 2017 Tom Engström for Lyfta
*/
define( [
	'require',
	'dojo/_base/declare',
	'dojo/aspect',

	'quantum/deferred/EagerQueue',
	'quantum/Deferred',
	'quantum/_Debug',
	
	'horizon/portable/LaidOut',
    'horizon/style/Text',
    'horizon/style/Box',
	
    'materia/facade/Cloud',
    'materia/FieldSpec',
    
	'whitespace/portable/RecordLink',
	'whitespace/portable/RecordName',
	'whitespace/portable/field/ValueDiv',

    'qrmv/facade/Article',
	
    'qrmv/portable/view/_SubPage',
    'qrmv/portable/TopicArticles',
    
	'qrmv/style/position',
	'qrmv/style/type',
	'qrmv/style/color',
	
	'qrmv/constants'
], function(
	require,
	declare,
	aspect,
	
	EagerQueue,
	Deferred,
	_Debug,
	
	LaidOut,
	TextStyle,
	BoxStyle,
	
	Cloud,
	FieldSpec,
	
	RecordLink,
	RecordName,
	ValueDiv,
	
	facade_Article,
	
	_SubPage,
	TopicArticles,
	
	position,
	type,
	color,
	
	constants
) {
	
	return declare( [ _SubPage, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/view/Article',
		IS_STANDALONE: true,
		
		__get_home: null,
		
		constructor: function() {
			var self = this;
			//self.enable_debug();
			return;
		},
		
		_layout_apply: function(event) {
			var self = this;
			
			self._log('_layout_apply', event);

			var clone = event.clone();
			
			self._apply_subpage_style( {
				clone: clone,
				event: event
			} );
			
			return self._layout_propagate(clone);
		},
		
		_layout_populate: function(ev) {
			var self = this;
			
			var dom_tools = self._get_dom_tools();
			var session = self._get_session();
			var record = session.get_selected_object();
			
			var ui_language = session.get_language();

			// General subpage layout
			var parent_populate = self._subpage_layout_populate(ev);
			
			var content_container = self.get_portable_attachment('content-container');
			var left_column = self.get_portable_attachment('left-column');
			
			var queue = new EagerQueue();
			queue.enqueue( function(parent_complete) {
				parent_populate.then(function() {
					parent_complete.resolve();
				}, self._not_reached );
			} );
			
			// Left column
			// Add Topic Articles
			queue.enqueue( function(articles_placed) {
				record.get_facade(facade_Article).get_parent_topic(ui_language).then( function(parent_topic) {
					var topic_articles = new TopicArticles( {
						session: session,
						record: parent_topic,
						selected_article: record
					} );
					var left_column = self.get_portable_attachment('left-column');
					left_column.push( topic_articles );
					articles_placed.resolve();
				}, function(error) {
					self._log_warn( 'parent topic error (left column)', error );
					articles_placed.resolve();
				} );
			});
			
			// Main content
			// Page Title
			var page_title_wrapper = new LaidOut({ session: session });
			dom_tools.set_jss( page_title_wrapper.domNode, type.heading );
			content_container.push(page_title_wrapper);

			queue.enqueue( function(page_title_set) {
				record.get_facade(facade_Article).get_parent_topic(ui_language).then( function(parent_topic) {
					var record_name = new RecordName( {
						session: session,
						record: parent_topic,
						style_type: 'qrmv_record',
						style_key: 'name',
						preferred_language: ui_language,
						inline_block: true
					} );
					page_title_wrapper.layout_place(record_name);
					page_title_set.resolve();
				}, function(error) {
					self._log_warn( 'parent topic error (page title)', error );
					page_title_set.resolve();
				} );
			});

			// Article name
			var article_name = new RecordName( {
				session: session,
				record: record,
				style_type: 'qrmv_subpage',
				style_key: 'article_title',
				preferred_language: ui_language,
				inline_block: true
			} );
			
			// FIXME add external link
			var article_link = new RecordLink({
				session: session,
				record: record,
				preferred_language: self._get_session().get_language(),
				text_decoration: 'inherit',
				color: 'inherit'
			});
			article_link.layout_place(article_name);
			content_container.push(article_link);
			
			// Authors
			var authors = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: record,
					name_object: facade_Article.FIELDS.AUTHORS,
					language: ui_language
				} ),
				ui_language: ui_language
			} );
			content_container.push(authors);
			
			var create_meta_field_div = function(field_name_object) {
			
				var meta_field_container = new LaidOut({ session: session });
				
				var field_name_record = session.get_broker().get(field_name_object.get_numid());
				var field_name = new RecordName( {
					session: session,
					record: field_name_record,
					preferred_language: ui_language,
					inline_block: true
				} );
				dom_tools.set_jss( field_name.domNode, type.article_meta_field_name );
				meta_field_container.layout_place( field_name );
				content_container.push(meta_field_container);
				
				var value_div = new ValueDiv( {
					session: session,
					field_spec: new FieldSpec( {
						record: record,
						name_object: field_name_object,
						language: ui_language
					} ),
					ui_language: ui_language
				} );
				dom_tools.set_jss( value_div.domNode, type.article_meta_field_value );
				meta_field_container.layout_place( value_div );
			};
			
			// Publish date
			create_meta_field_div(facade_Article.FIELDS.PUBLISH_DATE);

			// FIXME Add Journal, Volume, Issue meta fields
			
			// Abstract
			var abstract_title_record = session.get_broker().get(facade_Article.FIELDS.ABSTRACT.get_numid());
			var abstract_title = new RecordName( {
				session: session,
				record: abstract_title_record,
				style_type: 'qrmv_subpage',
				style_key: 'article_title',
				preferred_language: ui_language,
				inline_block: true
			} );
			content_container.push( abstract_title );
			var abstract = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: record,
					name_object: facade_Article.FIELDS.ABSTRACT,
					language: ui_language
				} ),
				ui_language: ui_language
			} );
			dom_tools.set_jss( abstract.domNode, type.paragraph );
			content_container.push(abstract);
			
			queue.finish();
			return queue.dequeue_all();
		},
		
		_layout_startup: function(ev) {
			var self = this;
			
			self._log('_layout_startup', ev);
			
			var session = self._get_session();
			var cloud = session.get_cloud_object();
			var get_home = cloud.get_facade(Cloud).get_home();
			var record = session.get_selected_object();
			var ui_language = session.get_language();
			
			var compact_action = self.get_portable_attachment('compact_action');
			self.own( aspect.after( compact_action, 'on_click', function() {
				// Go back
				self._log('compact clicked');
				
				get_home.then(function(home) {
					var session = self._get_session();
					session.navigation_click( home, session.get_language() );
				}, function(error) {
					self._log_warn("couldn't get home object", error);
				});
				
			} ) );
			
			var edit_action = self.get_portable_attachment('edit_action');
			if (edit_action) {
				self.own( aspect.after( edit_action, 'on_click', function() {
					// Close the sidebar
					self._log('edit clicked');
					
					var session = self._get_session();
					var record = session.get_selected_object();
					// FIXME use single page navi when possible
					var url = session.construct_url( {
						nob_id: record.get_numid(),
						language: session.get_language(),
						view: constants.RECORD_TYPE_ID
					} );
					window.location.href = url;
				} ) );
			}
			
			return self.inherited(arguments);
		}
		
	} );
	
} );
