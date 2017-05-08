/* (c) 2017 Sam Engström for Lyfta
*  (c) 2017 Tom Engström for Lyfta
*/
define( [
	'require',
	'dojo/_base/declare',
	'dojo/aspect',

	'quantum/Deferred',
	'quantum/_Debug',
	
	'horizon/portable/LaidOut',
	'horizon/portable/LaidOutContainer',
    'horizon/style/Text',
    'horizon/style/Box',
	
    'materia/facade/Cloud',
    'materia/FieldSpec',
    
	'whitespace/portable/RecordName',
	'whitespace/portable/field/ValueDiv',
    
    'qrmv/facade/Topic',
	
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
	
	Deferred,
	_Debug,
	
	LaidOut,
	LaidOutContainer,
	TextStyle,
	BoxStyle,
	
	Cloud,
	FieldSpec,
	
	RecordName,
	ValueDiv,
	
	Topic,
	
	_SubPage,
	TopicArticles,
	
	position,
	type,
	color,
	
	constants
) {
	
	return declare( [ _SubPage, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/view/Topic',
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

			// Topic articles
			var topic_articles = new TopicArticles( {
				session: session,
				record: record
			} );
			left_column.push( topic_articles );
			
			// Title
			var record_name_wrapper = new LaidOut({ session: session });
			var record_name = new RecordName( {
				session: session,
				record: record,
				style_type: 'qrmv_sidebar',
				style_key: 'name',
				preferred_language: ui_language,
				inline_block: true
			} );
			record_name_wrapper.layout_place( record_name );
			content_container.push(record_name_wrapper);
			
			dom_tools.set_jss( record_name_wrapper.domNode, type.heading );
			
			// Interview video
			var video = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: record,
					name_object: Topic.FIELDS.VIDEO,
					language: ui_language
				} ),
				ui_language: ui_language
			} );
			content_container.push(video);
			
			// Description
			var text_div = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: record,
					name_object: Topic.FIELDS.BODY,
					language: ui_language
				} ),
				ui_language: ui_language
			} );
			content_container.push(text_div);
			dom_tools.set_jss( text_div.domNode, type.paragraph );
			
			return parent_populate;
		},
		
		_layout_startup: function(ev) {
			var self = this;
			
			self._log('_layout_startup', ev);
			
			var session = self._get_session();
			var cloud = session.get_cloud_object();
			var get_home = cloud.get_facade(Cloud).get_home();
			
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
