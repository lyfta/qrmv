define([
	'require',
	'dojo/_base/declare',
	
	'quantum/_Debug',
	'quantum/Deferred',
	
	'horizon/portable/LaidOut',
	'horizon/portable/LaidOutContainer',
	
    'horizon/style/Text',
    'horizon/style/Box',
	
    'qrmv/portable/Logo',
    'qrmv/portable/Action',
	'qrmv/portable/TopicArticles',
    
	'qrmv/constants',
	'qrmv/style/color',
	'qrmv/style/position',
	'qrmv/style/type'
], function(
	require,
	declare,
	
	_Debug,
	Deferred,
	
	LaidOut,
	LaidOutContainer,
	
	TextStyle,
	BoxStyle,
	
	Logo,
	Action,
	TopicArticles,
	
	constants,
	color,
	position,
	type
) {

	return declare( [LaidOut, _Debug], {
		
		// Don't flash the blank screen
		indicate_navigation: function(do_indicate) {},
		
		_apply_subpage_style: function(args) {
			var self = this;
			
			var clone = args.clone;
			var event = args.event;
			
			var padding_top = constants.trim_px( position.page['padding-top'] );
			var padding_left = constants.trim_px( position.page['padding-left'] );
			var padding_right = constants.trim_px( position.page['padding-right'] );
			
			//clone.set_visible_height( event.get_visible_height() - padding_top );
			//clone.set_width( event.get_width() - padding_left - padding_right );
			
			var dom_tools = self._get_dom_tools();
			dom_tools.set_jss( self.domNode, {
				'background-color': color.black,
				'min-height': 			clone.get_visible_height() + 'px',
				color: 				'white',
				'font-family':  	type.general['font-family'],
				'padding-top':  	position.page['padding-top'],
				//'padding-left':  	position.page['padding-left'],
				//'padding-right':  	position.page['padding-right'],
				'padding-bottom':  	position.page['padding-bottom']
			} );
			
			var field_name_style_args = constants.jss_to_text_style_args( type.field_name );

			var col_style_args = constants.jss_to_box_style_args( position.column );
			var row_style_args = constants.jss_to_box_style_args( position.row );

			clone.set_style( 'qrmv_subpage', {
				article_title:				new TextStyle(constants.jss_to_text_style_args( type.article_title) ),
				field_name: 				new TextStyle(field_name_style_args),
				vertically_separated:   new BoxStyle(col_style_args),
				horizontally_separated: new BoxStyle(row_style_args)
			} );

			var sidebar_container = self.get_portable_attachment('sidebar-container');
			var container = self.get_portable_attachment('container');
			var left_column = self.get_portable_attachment('left-column');
			var content_container = self.get_portable_attachment('content-container');
			var logo = self.get_portable_attachment('logo');

			if ( event.get_width() > 700 ) { // wide arrangement
				container.set_min_width(1);
				container.place_at( 0, left_column );
				left_column.place_at( 0, logo );
				container.place_at( 1, content_container );
				container.place_at( 2, sidebar_container );
			}
			else { // narrow arrangement
				container.set_min_width(1000);
				container.place_at( 0, sidebar_container );
				sidebar_container.place_at( 0, logo );
				container.place_at( 1, content_container );
				container.place_at( 2, left_column );
			}
			
			var compact_action = self.get_portable_attachment('compact_action');
			if ( event.get_width() > 900 ) { // Same breakpoint as in SideBar
				compact_action.set_rotation(0);
			}
			else {
				compact_action.set_rotation(90);
			}

			return;
		},
		
		_subpage_layout_populate: function(ev) {
			var self = this;
			
			var deferred = new Deferred();
			
			var dom_tools = self._get_dom_tools();
			var session = self._get_session();
			var record = session.get_selected_object();
			
			var ui_language = session.get_language();

			// Main layout container
			var container = new LaidOutContainer( {
				session: session,
				min_width: 1000,
				style_type: 'page',
				child_style_type: 'qrmv_subpage',
				width_arrangement: [ 32, 68, '60px' ]
			} );
			self.layout_place(container);
			self.set_portable_attachment('container', container);
			
			// Left column
			var left_column = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				child_style_type: 'qrmv_subpage',
				style_type: 'invisible'
			} );
			self.set_portable_attachment('left-column', left_column);
			container.push( left_column );
			
			// Logo
			var logo = new Logo( {
				session: session,
				image_key: 'inverted_logo',
				max_width: 175
			} );
			left_column.push(logo);
			self.set_portable_attachment( 'logo', logo );
			
			// Content
			var content_container = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				style_type: 'invisible',
				child_style_type: 'article'
			} );
			self.set_portable_attachment('content-container', content_container);
			container.push(content_container);
			
			// Controls and share buttons
			var sidebar_container = new LaidOutContainer({
				session: session,
				min_width: 1,
				width_arrangement: [ 1, '70px' ],
				style_type: 'invisible',
				child_style_type: 'article'
			});
			self.set_portable_attachment('sidebar-container', sidebar_container);
			container.push(sidebar_container);
			
			var action_container = new LaidOutContainer( {
				session: session,
				style_type: 'invisible',
				child_style_type: 'paragraph',
				width_arrangement: [ Action.SIZE + 'px', Action.SIZE + 'px' ]
			} );
			sidebar_container.push( action_container );
			
			// Compact action
			var compact_action = new Action( {
				session: session,
				key: 'compact'
			} );
			action_container.push( compact_action );
			self.set_portable_attachment( 'compact_action', compact_action );
			
			// Edit action
			record.is_edit_allowed().then( function(is_allowed) {
				if (is_allowed) { 
					var edit_action = new Action( {
						session: session,
						key: 'edit'
					} );
					action_container.push( edit_action );
					self.set_portable_attachment( 'edit_action', edit_action )
				}
				deferred.resolve();				
			}, function(error) {
				self._log_warn( 'unable to get edit status', error );
				deferred.resolve();
			} );
			
			return deferred;
		}
		
	} );
});