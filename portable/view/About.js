/* (c) 2017 Sam Engström for Lyfta
*/
define( [
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/aspect',

	'quantum/Deferred',
	'quantum/_Debug',
	
	'materia/facade/Cloud',
	
	'horizon/portable/LaidOut',
	'horizon/portable/LaidOutContainer',
    'horizon/style/Text',
    'horizon/style/Box',
	
	'whitespace/portable/RecordName',
	'whitespace/portable/Record',

	'qrmv/portable/Action',
	'qrmv/style/position',
	'qrmv/style/type',
	'qrmv/style/color',
	'qrmv/constants'
], function(
	declare,
	lang,
	aspect,

	Deferred,
	_Debug,
	
	Cloud,
	
	LaidOut,
	LaidOutContainer,
	TextStyle,
	BoxStyle,

	RecordName,
	Record,

	Action,
	position,
	type,
	color,
	constants
) {
	
	return declare( [ LaidOut, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/view/About',
		IS_STANDALONE: true,

		constructor: function() {
			var self = this;
			//self.enable_debug();
			return;
		},
		
		indicate_navigation: function(do_indicate) {},

		_layout_apply: function(event) {
			var self = this;
			
			var clone = event.clone();

			var padding_top = constants.trim_px( position.page['padding-top'] );
			var padding_left = constants.trim_px( position.page['padding-left'] );
			var padding_right = constants.trim_px( position.page['padding-right'] );
			
			//clone.set_visible_height( event.get_visible_height() - padding_top );
			//clone.set_width( event.get_width() - padding_left - padding_right );
			
			var dom_tools = self._get_dom_tools();
			dom_tools.set_jss( self.domNode, {
				'background-color': color.background,
				'min-height': 			clone.get_visible_height() + 'px',
				'font-family':  	type.general['font-family'],
				'padding-top':  	position.page['padding-top'],
				//'padding-left':  	position.page['padding-left'],
				//'padding-right':  	position.page['padding-right'],
				'padding-bottom':  	position.page['padding-bottom']
			} );
			
			var base_unit = clone.get_style('base_unit');
			
			clone.set_style( 'whitespace/portable/Media', {
				box: new BoxStyle( {
					border: base_unit / 2,
					border_color: color.red,
					border_style: 'solid',
					//centered: true,
					max_width: 600
				} )
			} );

			clone.set_style( 'qrmv-about-paragraph', {
				heading: new TextStyle( {
					color: color.red,
					font_weight: 'bold',
					text_transform: 'uppercase'
				} ),
				horizontally_separated: new BoxStyle( {
					padding_top: ( base_unit * 4 ),
					padding_bottom: ( base_unit * 4 ),
					border_collapse: true
				} )
			} );

			return self._layout_propagate(clone);
		},
		
		_layout_populate: function(ev) {
			var self = this;
			var deferred = new Deferred();
			
			var dom_tools = self._get_dom_tools();
			var session = self._get_session();
			var record = session.get_selected_object();
			var ui_language = session.get_language();

			var content_container = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				style_type: 'page',
				child_style_type: 'article-group'
			} );
			self.layout_place(content_container);
			
			var title_container = new LaidOutContainer( {
				session: session,
				style_type: 'paragraph',
				width_arrangement: [ 1, Action.SIZE + 'px', Action.SIZE + 'px' ],
				min_width: 1
			} );
			content_container.push(title_container);

			// Title
			var record_name_wrapper = new LaidOut( { session: session } );
			var record_name = new RecordName( {
				session: session,
				record: record,
				//style_type: 'qrmv_sidebar',
				//style_key: 'name',
				preferred_language: ui_language,
				inline_block: true
			} );
			record_name_wrapper.layout_place( record_name );

			title_container.push(record_name_wrapper);
			dom_tools.set_jss( record_name_wrapper.domNode, type.heading );
			
			var close_action = new Action( {
				session: session,
				key: 'close',
				fill: '000000'
			} );
			title_container.push(close_action);
			self.set_portable_attachment( 'close_action', close_action );
		
			var record_table = new Record( {
				session: session,
				record: record,
				language: ui_language,
				ui_language: ui_language,
				field_style_type: 'qrmv-about-paragraph'
			} );
			content_container.push(record_table);
			
			// Edit action
			record.is_edit_allowed().then( function(is_allowed) {
				if (is_allowed) { 
					var edit_action = new Action( {
						session: session,
						key: 'edit',
						fill: '000000'
					} );
					title_container.push( edit_action );
					self.set_portable_attachment( 'edit_action', edit_action )
				}
				deferred.resolve();				
			}, function(error) {
				self._log_warn( 'unable to get edit status', error );
				deferred.resolve();
			} );

			return deferred;
		},
		
		_layout_startup: function() {
			var self = this;
			
			var session = self._get_session();
			var ui_language = session.get_language();
			var cloud = session.get_cloud_object();
			var get_home = cloud.get_facade(Cloud).get_home();
			var record = session.get_selected_object();

			var close_action = self.get_portable_attachment('close_action');
			self.own( aspect.after( close_action, 'on_click', function() {
				get_home.then( function(home) {
					session.navigation_click( home, ui_language );
				}, self._not_reached );
			} ) );

			var edit_action = self.get_portable_attachment('edit_action');
			if (edit_action) {
				self.own( aspect.after( edit_action, 'on_click', function() {
					self._log('edit clicked');
					
					// FIXME use single page navi when possible
					var url = session.construct_url( {
						nob_id: record.get_numid(),
						language: session.get_language(),
						view: constants.BLOG_ENTRY_TYPE_ID
					} );
					window.location.href = url;
				} ) );
			}
			
			return self.inherited(arguments);
		}

	} );
	
} );
