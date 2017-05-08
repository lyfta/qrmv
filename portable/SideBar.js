// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/aspect',
	
	'quantum/_Debug',
	'quantum/Deferred',
	'horizon/portable/LaidOut',
	'horizon/portable/LaidOutContainer',

	'materia/FieldSpec',

	'whitespace/portable/RecordName',
	'whitespace/portable/_HasRecordArgs',
	'whitespace/portable/field/ValueDiv',
	
	'qrmv/constants',
	'qrmv/facade/Topic',
	'qrmv/facade/Category',
	'qrmv/style/type',
	'qrmv/style/color',
	
	'qrmv/portable/Action',
	'qrmv/portable/TopicArticles'
	
], function(
	require,
	declare,
	array,
	aspect,
	
	_Debug,
	Deferred,
	LaidOut,
	LaidOutContainer,
	
	FieldSpec,
	
	RecordName,
	_HasRecordArgs,
	ValueDiv,
	
	constants,
	Topic,
	Category,
	type,
	color,
	
	Action,
	TopicArticles
) {
	
	return declare( [ LaidOut, _HasRecordArgs, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/SideBar',
		
		constructor: function() {
			var self = this;
			var args = self._get_portable_args();
			
			//self.enable_debug();
			
			self.__record = args.record || self._confess('need record');
			return;
		},
		
		__set_jss: function(ev) {
			var self = this;

			var dom_tools = self._get_dom_tools();
			var padding = 20;
			var clone = ev.clone();
			clone.set_width( clone.get_width() - 2 * padding );
			clone.set_visible_height( clone.get_visible_height() - 2 * padding );
			
			var jss = {
				color: 			'white',
				background: 	'black',
				'min-height': 	clone.get_visible_height() + 'px',
				padding: 		padding +'px',
				'font-family':  type.general['font-family'],
				'position':		'relative',
				'z-index':		3
			};
			if (self.__is_mobile) {
				jss.position = 'fixed';
				jss.bottom = 0;
				jss['min-height'] = 0;
			}

			dom_tools.set_jss( self.domNode, jss );
			return clone;
		},

		_layout_apply: function(ev) {
			var self = this;
			
			var clone = self.__set_jss(ev);

			return self._layout_propagate(clone);
		},
		
		set_mobile: function() {
			var self = this;
			if ( self.__is_mobile ) return;
			self.__is_mobile = true;
			var header_container = self.get_portable_attachment('header_container');
			if (!header_container) return;
			var container = self.get_portable_attachment('container');
			var expand_action = self.get_portable_attachment('expand_action');
			expand_action.set_rotation(90);
			container.set_widgets( [ header_container ] );
			return;
		},
		
		set_not_mobile: function() {
			var self = this;
			if ( !self.__is_mobile ) return;
			self.__is_mobile = false;
			var header_container = self.get_portable_attachment('header_container');
			if (!header_container) return;
			var container = self.get_portable_attachment('container');
			var text_div = self.get_portable_attachment('text_div');
			var video = self.get_portable_attachment('video');
			var topic_articles = self.get_portable_attachment('topic_articles');
			var expand_action = self.get_portable_attachment('expand_action');
			expand_action.set_rotation(0);
			container.set_widgets( [ header_container, text_div, video, topic_articles ] );
			return;
		},

		on_close_click: function() {},

		_layout_populate: function(ev) {
			var self = this;
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(error); }

			var session = self._get_session();
			var ui_language = session.get_language();
			var record = self.__record;
			
			var dom_tools = self._get_dom_tools();
			
			self.__set_jss(ev);
			
			// Entire side bar container
			var container = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				style_type: 'invisible',
				child_style_type: 'article'
			} );
			self.layout_place(container);
			self.set_portable_attachment( 'container', container );
			
			// Title and controls container
			var header_container = new LaidOutContainer( {
				session: session,
				style_type: 'invisible',
				child_style_type: 'paragraph',
				min_width: 1, // never horizontal
				width_arrangement: [ 1, Action.SIZE + 'px', Action.SIZE + 'px', Action.SIZE + 'px' ]
			} );
			container.push(header_container);
			self.set_portable_attachment('header_container', header_container );

			// Title
			var record_name_wrapper = new LaidOut({ session: session });
			var record_name = new RecordName( {
				session: session,
				record: record,
				style_type: 'qrmv_sidebar',
				style_key: 'name',
				preferred_language: self._get_session().get_language(),
				inline_block: true
			} );
			record_name_wrapper.layout_place( record_name );
			header_container.push(record_name_wrapper);
			dom_tools.set_jss( record_name_wrapper.domNode, type.heading );
			
			// Expand
			var expand_action = new Action( {
				session: session,
				key: 'expand'
			} );
			header_container.push( expand_action );
			self.set_portable_attachment('expand_action', expand_action);
			if (self.__is_mobile) expand_action.set_rotation(90);

			// Close
			var close_action = new Action( {
				session: session,
				key: 'close'
			} );
			header_container.push( close_action );
			self.set_portable_attachment('close_action', close_action);
			
			// Edit
			record.is_edit_allowed().then( function(is_allowed) {
				if (is_allowed) { 
					var edit_action = new Action( {
						session: session,
						key: 'edit'
					} );
					header_container.push( edit_action );
					self.set_portable_attachment( 'edit_action', edit_action )
				}
				deferred.resolve();				
			}, function(error) {
				self._log_warn( 'unable to get edit status', error );
				deferred.resolve();
			} );
			
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
			if ( !self.__is_mobile ) container.push(text_div);
			self.set_portable_attachment( 'text_div', text_div );
			dom_tools.set_jss( text_div.domNode, type.paragraph );
			
			// Interview
			var video = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: record,
					name_object: Topic.FIELDS.VIDEO,
					language: ui_language
				} ),
				ui_language: ui_language
			} );
			self.set_portable_attachment( 'video', video );
			if ( !self.__is_mobile ) container.push(video);
			
			// Associated articles
			var topic_articles = new TopicArticles( {
				session: session,
				record: record
			} );
			self.set_portable_attachment( 'topic_articles', topic_articles );
			if ( !self.__is_mobile ) container.push( topic_articles );
			
			return deferred;
		},
		
		_layout_startup: function() {
			var self = this;
			
			var session = self._get_session();
			
			var expand_action = self.get_portable_attachment('expand_action');
			self.own( aspect.after( expand_action, 'on_click', function() {
				// Open the record
				self._log( 'expand clicked' );
				session.navigation_click( self.__record, session.get_language() );
			} ) );
			
			var close_action = self.get_portable_attachment('close_action');
			self.own( aspect.after( close_action, 'on_click', function() {
				// Close the sidebar
				self._log('close clicked');
				self.on_close_click();
			} ) );
			
			var edit_action = self.get_portable_attachment('edit_action');
			self.own( aspect.after( edit_action, 'on_click', function() {
				// Close the sidebar
				self._log('edit clicked');
				
				// FIXME use single page navi when possible
				var url = session.construct_url( {
					nob_id: self.__record.get_numid(),
					language:  session.get_language(),
					view: constants.RECORD_TYPE_ID
				} );
				window.location.href = url;
				
			} ) );
			
			return self.inherited(arguments);
		}
		
	} );
} );
