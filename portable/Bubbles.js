// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/aspect',
	
	'quantum/_Debug',
	'quantum/Deferred',
	'quantum/deferred/EagerQueue',
	'quantum/class-loader',
	
	'horizon/portable/LaidOut',
	
	'qrmv/facade/Topic',
	'qrmv/style/color'
], function(
	require,
	declare,
	array,
	aspect,

	_Debug,
	Deferred,
	EagerQueue,
	class_loader,
	
	LaidOut,
	
	Topic,
	color
) {
	
	var SVG_NODE_ID = 'bubbles-svg';
	
	return declare( [ LaidOut, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/Bubbles',
		
		constructor: function() {
			var self = this;
			//self.enable_debug();
			return;
		},
		
		// Fired every time the dimensions change (except minor mobile
		// address bar show/no-show events)
		_layout_apply: function(ev) {
			var self = this;

			var dom_tools = self._get_dom_tools();
			self._log('_layout_apply', ev);

			dom_tools.set_jss( self.domNode, {
				'background-color': color.background,
				width: 				ev.get_width() + 'px',
				height: 			ev.get_visible_height() + 'px',
				'position':			'fixed',
				'z-index':			'2'
			} );
			
			var video_container = self.get_portable_attachment('video-container');
			
			if ( self.__bubble_tree ) self.__bubble_tree.resize_svg_node();

			return self.inherited(arguments);
		},

		// Fired once either on the server side or on the client side, before
		// apply and startup
		_layout_populate: function(ev) {
			var self = this;
			
			var session = self._get_session();
			var dom_tools = self._get_dom_tools();

			var dom_construct = dom_tools.construct;
			var svg_node;
			if (dom_tools.window) {
				// Must specify namespace when creating svg tags programmatically in
				// the browser. Fix to tsp.ac/846385458
				svg_node = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
			}
			else {
				svg_node = dom_construct.create('svg');
			}
			dom_tools.attr.set( svg_node, 'id', SVG_NODE_ID );
			dom_construct.place( svg_node, self.domNode );
			
			return self.inherited(arguments);
		},
		
		on_click: function(which) {
			var self = this;
			self._log('on_click', which);
			return;
		},
		
		/**
		 * Preloads all the topics and their title fields to display the bubbles
		 * 
		 * FIXME should this be moved to /facade somewhere ?
		 */
		__load_topics: function() {
			var self = this;
			
			var get_subtopics_of = function(topic) {
				var deferred = new Deferred();
				var get_subtopics = topic.get_facade(Topic).get_subtopics();
				var get_name = topic.get_name( self._get_session().get_language() );
				
				// Get name
				get_name.then(function(name) {
					// Get subtopics
					get_subtopics.then( function(subtopics) {
						if ( subtopics && subtopics.length) {
							var queue = new EagerQueue();
							array.forEach( subtopics, function(subtopic) {
								queue.enqueue( function(loaded) {
									get_subtopics_of(subtopic).then(function(result_topic) {
										loaded.resolve(result_topic);
									}, function(error) {
										self._log('error loading subtopics', error);
									});
								});
							});
							queue.finish();
							queue.dequeue_all().then(function(result_topics) {
								// Loaded all descendant topics, resolve
								deferred.resolve({
									name: name,
									record: topic,
									subtopics: result_topics
								});
							}, function(error) {
								self._log('error dequeuing subtopics', error);
							});
							return;
						}
						// No more descendant topics, resolve
						deferred.resolve({
							name: name,
							record: topic,
							subtopics: []
						});
					}, function(error) {
						self._log_warn('failed to load subtopics for topic', error );
					});
				}, function(error) {
					self._log_warn('failed to load name', error);
				});
				return deferred;
			};
			
			var selected = self._get_session().get_selected_object();
			// Return subtopics of front page
			return get_subtopics_of(selected);
		},
		
		center_selected_element: function() {
			var self = this;
			if ( !self.__bubble_tree ) return;
			self.__bubble_tree.center_selected_element();
			return;
		},

		// Fired once on the client side after populate and apply
		_layout_startup: function() {
			var self = this;
			
			var dom_tools = self._get_dom_tools();
			var dom_construct = dom_tools.construct;
			
			var load_topics = self.__load_topics();
			class_loader.require( 'qrmv/widget/BubbleTree' ).then(function( BubbleTree ) {
				self._log('got BubbleTree', BubbleTree);
				self._log('selected object is', { selected: self._get_session().get_selected_object()  });
				
				load_topics.then( function(topics) {
					self._log( 'got topics', topics );
					
					var bubbles = new BubbleTree({
						svg_node_id: SVG_NODE_ID,
						topics: topics
					});
					self.own( aspect.after( bubbles, 'on_bubble_open', function(target) {
						self.on_click(target);
					}, true ) );
					self.own( aspect.after( bubbles, 'on_bubble_close', function(target) {
						self._log( 'bubble closed, not doing anything' );
					}, true ) );
					
					
					self.__bubble_tree = bubbles;
				}, function(error) {
					self._log('error loading topics', error);
				});
			}, function(error) {
				self._log_warn('require failed', error);
			});
			
			return self.inherited(arguments);
		},
		
		// Called when this is removed from DOM
//		_layout_detach: function() {
//			var self = this;
//			return;
//		}
		
	} );
} );
