// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/aspect',
	
	'quantum/_Debug',
	'quantum/Deferred',
	'quantum/deferred/LazyQueue',
	'quantum/class-loader',

	'horizon/portable/LaidOut',
	'horizon/portable/LaidOutContainer',
	'horizon/portable/PulsatingLaidOut',
    'horizon/style/Text',
    'horizon/style/Box',
    'horizon/portable/Label',
    
	'whitespace/portable/_HasResources',
	'whitespace/portable/LoginBarToggler',
	'whitespace/portable/RecordLink',
	'whitespace/portable/SplashScreen',
	'materia/facade/Image',
	
	'qrmv/facade/Topic',
	
	'qrmv/portable/Logo',
	'qrmv/portable/Bubbles',
	'qrmv/portable/SideBar',

	'qrmv/style/position',
	'qrmv/style/type',
	'qrmv/style/color',

	'qrmv/constants'
], function(
	require,
	declare,
	aspect,
	
	_Debug,
	Deferred,
	LazyQueue,
	class_loader,
	
	LaidOut,
	LaidOutContainer,
	PulsatingLaidOut,
	TextStyle,
	BoxStyle,
	Label,
	
	_HasResources,
	LoginBarToggler,
	RecordLink,
	SplashScreen,
	ImageFacade,
	
	Topic,
	
	Logo,
	Bubbles,
	SideBar,
	
	position,
	type,
	color,
	
	constants
) {
	
	var ABOUT_PAGE = 1026570162;

	return declare( [ LaidOut, _HasResources, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/view/Bubbles',
		IS_STANDALONE: true,
		
		constructor: function() {
			var self = this;
			//self.enable_debug();
			
			self.__load_fx = new Deferred();
			
			self._use_resources(490592781);
			return;
		},
		
		__skip_intro: function() {
			var self = this;
			
			var intro_container = self.get_portable_attachment('intro-container');
			if (intro_container) {
				intro_container.destroy();
				self.set_portable_attachment( 'intro-container', null );
				self.set_portable_attachment('skip-button', null)
			}
			
			return;
		},
		
		_layout_apply: function(/* LayoutSizeEvent */ event) {
			var self = this;
			
			var clone = event.clone();
			var dom_tools = self._get_dom_tools();
			
			dom_tools.set_jss( self.domNode, {
				//'background-color': color.black,
				'background-color': color.background,
				'height': event.get_visible_height() + 'px'
			} );
			
			clone.set_style( 'qrmv_front-page_column', {
				heading: new TextStyle({}),
				box: new BoxStyle({})
			});
			
			clone.set_style( 'qrmv_logo_bar', {
				box: new BoxStyle( {
					padding_top:  constants.trim_px( position.page['padding-top'] ),
					padding_left: constants.trim_px( position.page['padding-left'] ),
					padding_right: constants.trim_px( position.page['padding-right'] )
				} )
			} );

			var about_button_wrapper = self.get_portable_attachment('about_button_wrapper');
			dom_tools.set_jss( about_button_wrapper.domNode, {
				'font-size': '24px',
				'font-family': 'Montserrat, sans-serif',
				cursor: 'pointer',
				'line-height': '1em',
				'letter-spacing': '3px',
				'font-weight': 700,
				'text-transform': 'uppercase',
				color: color.black,
				display: 'inline-block',
				padding: '1px 5px 0px 5px',
				background: color.red
			} );

			var intro_container = self.get_portable_attachment('intro-container');
			if (intro_container) {
				dom_tools.set_jss( intro_container.domNode, {
					position: 'fixed',
					'z-index': 10,
					top: 0,
					left: 0,
					background: color.background,
					width: '100%',
					height: '100%'
				} );
			}
			var intro_video = self.get_portable_attachment('intro_video');
			
			var sidebar = self.get_portable_attachment('sidebar');
			var container = self.get_portable_attachment('container');
			if (sidebar) {
				if ( event.get_width() < 900 ) {
					container.set_min_width(900);
					sidebar.set_mobile();
				}
				else {
					container.set_min_width(1);
					sidebar.set_not_mobile();
				}
			}

			return self._layout_propagate(clone);
		},
		
		_layout_populate: function(ev) {
			var self = this;

			var session = self._get_session();
			var broker = session.get_broker();
			var dom_tools = self._get_dom_tools();
			var ui_language = session.get_language();
			var selected = session.get_selected_object();
			var dom_attr = dom_tools.attr;
			var dom_construct = dom_tools.construct;

			// Main content
			var container = new LaidOutContainer( {
				session: session,
				style_type: 'invisible',
				child_style_type: 'qrmv_front-page_column',
				min_width: 1,
				width_arrangement: [ 62, 38 ]
			} );
			self.set_portable_attachment( 'container', container );
			self.layout_place(container);
			
			var bubbles_and_logo = new LaidOut( { session: session } );
			
			var bubbles = new Bubbles( {
				session: session
			} );
			self.set_portable_attachment( 'bubbles', bubbles );
			container.push(bubbles_and_logo);
			bubbles_and_logo.layout_place(bubbles);
			
			var logo = new Logo( {
				session: 	session,
				max_width: 	175
			} );
			
			var logo_bar_container = new LaidOutContainer( {
				session: session,
				style_type: 'qrmv_logo_bar',
				min_width: 1,
				width_arrangement: [ 1, 1 ]
			} );
			
			var bar_right_container = new LaidOutContainer( {
				session: session,
				style_type: 'paragraph',
				child_style_type: 'article',
				horizontal_only: true
			} );
			
			var login_toggler = new LoginBarToggler( {
				session: session
			} );
			bar_right_container.push(login_toggler);

			var about_button_aligner = new LaidOut( {
				session: session
			} );
			dom_tools.set_jss( about_button_aligner.domNode, {
				'text-align': 'right'
			} );
			var about_link = new RecordLink( {
				session: session,
				record: broker.get(ABOUT_PAGE),
				text_decoration: 'inherit',
				preferred_language: ui_language
			} );
			self.set_portable_attachment( 'about_link', about_link );
			var about_button_wrapper = new LaidOut( {
				session: session,
				node_type: 'span'
			} );
			self.set_portable_attachment( 'about_button_wrapper', about_button_wrapper );
			var about_button = new Label( {
				session: session
			} );
			about_button_wrapper.layout_place(about_button);
			about_link.layout_place(about_button_wrapper);
			about_button_aligner.layout_place(about_link);
			var about_pulsator = new PulsatingLaidOut( { session: session } );
			about_pulsator.layout_place(about_button_aligner);
			self.set_portable_attachment( 'about_pulsator', about_pulsator );
			bar_right_container.push(about_pulsator);
			self._set_label( about_button, 'about', ui_language );

			logo_bar_container.push(logo);
			logo_bar_container.push(bar_right_container);

			var logo_wrapper = new LaidOut({ session: session });
			logo_wrapper.layout_place(logo_bar_container);

			dom_tools.set_jss( logo_wrapper.domNode, {
				'position': 'fixed',
				'z-index': 	5,
				top:0,
				left:0
			})
			bubbles_and_logo.layout_place(logo_wrapper);

			// Show logo while loading
			var intro_container = new LaidOut({ session: session });
			self.layout_place( intro_container );
			self.set_portable_attachment( 'intro-container', intro_container );
			
			var splash = new SplashScreen( {
				session: session,
				force_image_on_white: true,
				background_color: color.background
			} );
			self.layout_place(splash);
			self.set_portable_attachment( 'splash', splash );
			
			return self.inherited(arguments);
		},
		
		// Not very elegant to refire layout manually, but needed to update
		// mobile/not mobile
		__refire_layout: function() {
			var self = this;
			var ev = self.get_latest_layout_event();
			if (ev) self.on_layout_event(ev);
			return;
		},
		
		indicate_navigation: function(do_indicate) {},

		_layout_startup: function() {
			var self = this;
			
			//var load_deferred = new Deferred();
			
			var session = self._get_session();
			var broker = session.get_broker();
			var ui_language = session.get_language();
			var dom_tools = self._get_dom_tools();
			var dom_construct = dom_tools.construct;
			
			var current_bubble;
			var bubbles = self.get_portable_attachment('bubbles');
			var container = self.get_portable_attachment('container');

			var ui_language = session.get_language();
			var intro_container = self.get_portable_attachment( 'intro-container' );
			if (intro_container) {
				class_loader.require('whitespace/portable/Video').then( function(Video){
					var selected = session.get_selected_object();
					selected.get_value( Topic.FIELDS.VIDEO.get_field_name(), ui_language ).then( function(records) {

						var intro_video = new Video( {
							session: session,
							record: records[0],
							ui_language: ui_language,
							disable_loop: true,
							hide_controls: true,
							autoplay: true,
							vertical_centering: true
						} );
						self.own( aspect.after( intro_video, 'on_video_end', function() {
							self._log('video_end_callback called');
							self.__fade_out_video();
						} ) );

						intro_container.layout_place(intro_video);
						var splash = self.get_portable_attachment('splash');
						setTimeout( function() {
							splash.fade_out();
						}, 1000 );

					}, self._not_reached );
				}, self._not_reached );
			}
			
			// Skip intro
			class_loader.require('horizon/event/ClickListener').then( function(ClickListener) {

				// Intro skip
				var skip = new LaidOut( { session: session } );
				dom_tools.set_jss( skip.domNode, {
					'position': 'fixed',
					'z-index': 7,
					'bottom': 	position.page['padding-bottom'],
					'left': 	position.page['padding-left'],
					cursor: 'pointer',
					color: color.black
				} );
				self._set_text_content( skip.domNode, 'do_skip', ui_language );
				intro_container.layout_place(skip);
				self.set_portable_attachment( 'skip-button', skip );

				self.own( new ClickListener( {
					node: skip.domNode,
					callback: function() {
						self.__skip_intro();
					}
				} ) );

			}, self._not_reached );

			class_loader.require('dojo/_base/fx').then( function(fx) {
				self.__load_fx.resolve(fx);
			}, self._not_reached );

			// Handle clicks sequentially if the user is faster than the network
			var change_queue = new LazyQueue();
			change_queue.dequeue_all();
			
			var handle_click = function(which) {
				var deferred = new Deferred();
				if ( current_bubble === which ) {
					self._log( 'current bubble sidebar already shown' );
					deferred.resolve();
					return deferred;
				}
				current_bubble = which;
				var old_sidebar = self.get_portable_attachment('sidebar');
				var new_sidebar = new SideBar( {
					session: session,
					record: which.get_record()
				} );
				self.own( aspect.after( new_sidebar, 'on_close_click', function() {
					self._log('close sidebar');
					self.set_portable_attachment( 'sidebar', null );
					container.remove(new_sidebar).then( function() {
						new_sidebar.destroy();
						current_bubble = null;
						self.__refire_layout();
						bubbles.center_selected_element();
					}, self._not_reached );
				} ) );

				self.set_portable_attachment( 'sidebar', new_sidebar );

				if (old_sidebar) {
					container.replace( old_sidebar, new_sidebar ).then( function() {
						deferred.resolve();
						self.__refire_layout();
						old_sidebar.destroy();
					}, function(error) {
						self._log_warn( 'sidebar replace error', error );
						deferred.resolve();
					} );
				}
				else {
					// Do a simultaneous ui update on refire for less twitching
					// tsp.ac/963997060
					var container_ev = container.get_latest_layout_event();
					container.set_latest_layout_event(null);
					container.push(new_sidebar).then( function() {
						self.__refire_layout();
						bubbles.center_selected_element();
						deferred.resolve();
					}, function(error) {
						self._log_warn( 'container set widgets error', error );
						deferred.resolve();
					} );
					
				}
				return deferred;
			}
			
			self.own( aspect.after( bubbles, 'on_click', function(which) {
				self._log('clicked a bubble', which);

				change_queue.enqueue( function(handled) {
					handle_click(which).then( function() {
						handled.resolve();
					}, function(error) {
						self._log_warn( 'error handling click', error );
						handled.resolve();
					} );
				} );
				
			}, true ) );
			
			var about_link = self.get_portable_attachment('about_link');
			var about_pulsator = self.get_portable_attachment('about_pulsator');

			self.own( aspect.after( about_link, 'on_navigation_start', function() {
				about_pulsator.start_pulsating();
			} ) );
			self.own( aspect.after( about_link, 'on_navigation_end', function() {
				about_pulsator.stop_pulsating();
			} ) );

			//return load_deferred;
			return self.inherited(arguments);
		},
		
		__fade_out_video: function() {
			var self = this;
			self._log('__fade_out_video');
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(error); }
			
			var session = self._get_session();

			var intro_container = self.get_portable_attachment('intro-container');
			
			self.__load_fx.then( function(fx) {
				self._log('__fade_out_video: got fx');
				var reader = session.get_broker().get_reader();
				reader.synchronize_iframe_user().then( function() {
					self._log('__fade_out_video: calling fadeOut');
					var anim = fx.fadeOut( {
						node: intro_container.domNode,
						onEnd: function() {
							self._log('__fade_out_video: end');
							var parent = intro_container.get_layout_parent();
							parent.layout_remove(intro_container).then( function() {
								deferred.resolve();
							}, reject );
						}
					} );
					anim.play();
				}, self._not_reached );
			}, self._not_reached );
			return deferred;
		}
		
	} );
	
} );
