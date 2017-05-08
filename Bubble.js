// (c) 2017 Tom Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	
	'quantum/_Debug',
	'quantum/Deferred',
	'quantum/deferred/EagerQueue',
	
    'horizon/jss/compiler',
	
	'qrmv/style/color',
	'qrmv/constants',
	'snap'
], function(
	require,
	declare,
	array,
	lang,
	
	_Debug,
	Deferred,
	EagerQueue,
	
	jss_compiler,
	
	style_color,
	constants,
	snap
	) {
	
	var HIDE_SPEED = 200;
	var SHOW_SPEED = 200;
	
	var LAYOUT_SCOPE = 'bubble-layout';
	var UI_SCOPE = 'bubble-ui';
	
	var DEBUG_ENABLED_FOR = {};
	DEBUG_ENABLED_FOR[UI_SCOPE] = false;
	DEBUG_ENABLED_FOR[LAYOUT_SCOPE] = false;
	
	var is_debug_scope_enabled = function(scope) {
		return DEBUG_ENABLED_FOR[scope];
	};
	

	// Styles
	var circle_jss = {
		'mix-blend-mode': 	'multiply',
		'fill-opacity': 	'0.7',
		'cursor': 			'pointer',
		'position': 		'relative'
	};
	
	var text_jss = {
		'font-weight': 		'bold',
		'fill': 			'white',
		'font-size':		'12px',
		'font-family': 		'Montserrat',
		'letter-spacing':	'0.5px',
		'text-align': 		'center',
		'position': 		'relative',
		'text-anchor':		'middle',
		'cursor':			'pointer'
	};
	
	var leaf_circle_jss = {
		'stroke-width': '5px',
		'stroke': style_color.red
	};
	
	var selected_circle_jss = {
		'fill-opacity': '1'
	};
	var selected_text_jss = {
		'fill': style_color.black
	};
	
	return declare( [_Debug], {
		
		constructor: function(args) {
			var self = this;
			
			self.set_debug_mid('qrmv/Bubble');
			//self.enable_debug();
			
			self.__app = args.app;
			
			self.__snap = args.snap;
			self.__parent = args.parent;
			
			self.__depth = args.depth;
			
			self.__name = args.name;
			self.__record = args.record;
			
			self.__radius = args.radius;
			self.__x = args.x;
			self.__y = args.y;
			
			var circle_base_jss = args.circle_jss || { fill: style_color.red };
			var text_base_jss = args.text_jss || {};
			
			self.__circle_jss = lang.mixin( circle_base_jss, circle_jss );
			// Leaf styles
			if (self.__depth == 2 ) {
				self.__circle_jss = lang.mixin( self.__circle_jss, leaf_circle_jss );
			}
			
			self.__text_jss = lang.mixin( text_base_jss, text_jss );
			
			self._log('constructed Bubble', args);
			return;
		},
		
		get_children: function() {
			return this.__children;
		},
		
		get_record: function() { return this.__record; },
		
		get_depth: function() {
			return this.__depth;
		},
		
		add_child: function(bubble) {
			var self = this;
			if (!self.__children) self.__children = [];
			self.__children.push(bubble);
			return;
		},
		
		get_previous_sibling_of: function(bubble) {
			var self = this;
			
			for ( var i = 0; i < self.__children.length; i++ ) {
				var i_bubble = self.__children[i];
				if ( i_bubble == bubble ) {
					if ( i > 0 ) {
						return self.__children[i-1];
					}
					else {
						// First node, previous sibling is parent's previous
						if(!self.__parent) return self.__previous_sibling;
						return self.__parent.get_previous_sibling_of(self);
					}
				}
			}
			// Shouldn't be reached
			Debug.error('previous sibling never found for bubble:', bubble);
			return;
		},
		
		get_next_sibling_of: function(bubble, breadth_only) {
			var self = this;
			
			for ( var i = 0; i < self.__children.length; i++ ) {
				var i_bubble = self.__children[i];
				if ( i_bubble == bubble ) {
					if ( i < self.__children.length - 1 ) {
						return self.__children[i+1];
					}
					if (breadth_only) return null;
					
					// Last node, next sibling is parent's next
					if(!self.__parent) return self.__next_sibling;
					return self.__parent.get_next_sibling_of(self);
				}
			}
			// Shouldn't be reached
			Debug.error('next sibling never found for bubble:', bubble);
			return;
		},
		
		/**
		 * Assuming origin is at top left corner.
		 */
		get_center: function() {
			var self = this;
			return {
				x: self.__x,
				y: self.__y
			};
		},
		
		get_global_center: function() {
			var self = this;
			
			var center = {
				x: self.__x,
				y: self.__y
			};
			var parent = self.get_parent();
			while(parent) {
				center.x += parent.get_center().x;
				center.y += parent.get_center().y;
				parent = parent.get_parent();
			}
			return center;
		},
		
		/**
		 * Assumes that this bubble and target bubble have
		 * elements on canvas
		 */
		__get_center_tangents_to: function(target) {
			var self = this;
			var center_s = self.get_global_center();
			var center_t = target.get_global_center();
			
			self._log('tangents from ' + self.get_name() + ' to ' + target.get_name() );
			self._log('global centers', {
				source: center_s,
				target: center_t
			});
			
			// Move target center coords to current coordinates
			center_t.x -= center_s.x;
			center_t.y -= center_s.y;
			
			var radius = self.__radius;
			
			if (  is_debug_scope_enabled(LAYOUT_SCOPE)  ) {
				self.__debug_group.add( self.__snap.circle( center_t.x, center_t.y, Math.random()*3).attr({
					stroke: '#FF0000',
					strokeWidth: 2
				}) );
				self.__debug_group.add( self.__snap.circle( 0, 0, 1).attr({
					stroke: '#0000FF',
					strokeWidth: 5
				}) );
				
				self.__debug_group.add( self.__snap.line( center_t.x, center_t.y, 0,0).attr({
					stroke: '#0000FF',
					strokeWidth: 0.5
				}));
				
			}
			
			// Find tangents
			var dx = center_t.x;
			var dy = center_t.y;
			var dd = Math.sqrt(dx * dx + dy * dy);
			
			var a = Math.asin(radius / dd);
			var b = Math.atan2(dy, dx);

			var t = b - a;
			var tangent_a = {
				x: center_t.x + target.get_radius() * Math.sin(t),
				y: center_t.y + target.get_radius() * -Math.cos(t)
			};
			t = b + a;
			var tangent_b = {
				x: center_t.x + target.get_radius() * -Math.sin(t),
				y: center_t.y + target.get_radius() * Math.cos(t)
			};
			self._log('__get_center_tangents_to', {
				center_t: center_t,
				center_s: center_s,
				dx: dx,
				dy: dy,
				dd: dd,
				a: a,
				b: b,
				tangent_a: tangent_a,
				tangent_b: tangent_b
			})
			
			if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
				self.__debug_group.add( self.__snap.circle( tangent_b.x, tangent_b.y, 2).attr({
					stroke: 'blue',
					strokeWidth: 1
				}) );
				self.__debug_group.add( self.__snap.circle( tangent_a.x, tangent_a.y, 2) .attr({
					stroke: 'orange',
					strokeWidth: 1
				}) );
			}

			return {
				a: tangent_a,
				b: tangent_b
			};
		},
		
		get_parent: function() {
			return this.__parent;
		},
		
		get_name: function() {
			return this.__name;
		},
		
		set_previous_sibling: function(bubble) {
			this.__previous_sibling = bubble;
		},
		set_next_sibling: function(bubble) {
			this.__next_sibling = bubble;
		},
		
		__get_previous_bubble: function() {
			var self = this;
			if (!self.__parent) {
				return self.__previous_sibling;
			}
			return self.__parent.get_previous_sibling_of(self);
		},
		__get_next_bubble: function(args) {
			var self = this;
			if(!args) args = {};
			if (!self.__parent) {
				return self.__next_sibling;
			}
			return self.__parent.get_next_sibling_of(self, args.breadth_only);
		},
		
		/**
		 * Gets the maximum available angle between the previous and next siblings
		 * of this circle
		 */
		__get_available_angle: function() {
			var self = this;
			
			// Get bubbles for layout
			var previous = self.__get_previous_bubble();
			var next = self.__get_next_bubble();
			var current = self;
			
			self._log( 'getting angle', {
				previous: previous,
				next: next,
				current: current
			});
			
			self._log('getting tangents from ' + self.get_name() + ' to prev:' + previous.get_name());
			var ptans = self.__get_center_tangents_to( previous  );
			self._log('getting tangents from ' + self.get_name() + ' to next: ' + next.get_name());
			var ntans = self.__get_center_tangents_to( next );
		
			// Find which tangents to use for gamma angle
			// this should be the one which is furthest away from both of the other's tangents
			var d_aa = constants.get_distance( ptans.a.x, ptans.a.y, ntans.a.x, ntans.a.y );
			var d_ab = constants.get_distance( ptans.a.x, ptans.a.y, ntans.b.x, ntans.b.y );
			var d_ba = constants.get_distance( ptans.b.x, ptans.b.y, ntans.a.x, ntans.a.y );
			var d_bb = constants.get_distance( ptans.b.x, ptans.b.y, ntans.b.x, ntans.b.y );				
			
			var prev_point = (d_aa + d_ab > d_ba + d_bb) ? ptans.a : ptans.b;
			var next_point = (d_aa + d_ba > d_ab + d_bb) ? ntans.a : ntans.b;
			
			self._log('tangents', {
				d_aa: d_aa,
				d_ab: d_ab,
				d_ba: d_ba,
				d_bb: d_bb,
				ptans: ptans,
				ntans: ntans,
				prev_pt: prev_point,
				next_pt: next_point
			});
			
			// Now find the angle between these two points
			var center = self.get_global_center();
			var d_prev = constants.get_distance( 0, 0, prev_point.x, prev_point.y );
			var d_next = constants.get_distance( 0, 0, next_point.x, next_point.y );
			
			if (  is_debug_scope_enabled(LAYOUT_SCOPE)  ) {
				self.__debug_group.add( self.__snap.line( 0, 0, prev_point.x, prev_point.y ).attr({
					stroke: 'orange',
					strokeWidth: 1
				}) );
				self.__debug_group.add( self.__snap.line( 0, 0, next_point.x, next_point.y ).attr({
					stroke: 'purple',
					strokeWidth: 1
				}) );
				
				self._log( 'got tangent points', {
					next_point: next_point,
					prev_point: prev_point
				} );
				
				var p_point = self.__snap.circle( prev_point.x, prev_point.y, 5);
				var n_point = self.__snap.circle( next_point.x, next_point.y, 5);
				var pn_points = self.__snap.group( p_point, n_point );
				p_point.attr( {
					stroke: '#FF0000',
					strokeWidth: 5
				} );
				n_point.attr( {
					stroke: '#00FF00',
					strokeWidth: 5
				} );
				var p_circle = self.__snap.circle( 0, 0, d_prev );
				var n_circle = self.__snap.circle( 0, 0, d_next );
				var pn_group = self.__snap.group(p_circle, n_circle);
				
				self.__debug_group.add( pn_points, pn_group );
				
				pn_group.attr({
					stroke: 'black',
					fill: 'none'
				});
			};

			// Find the angles to each tangent point
			var atan_prev = Math.atan2(
				prev_point.x - 0,
				prev_point.y - 0
			);
			var atan_next = Math.atan2(
				next_point.x - 0,
				next_point.y - 0
			);

			self._log( 'atans', {
				atan_prev_deg: 	Snap.deg(atan_prev),
				atan_next_deg: 	Snap.deg(atan_next),
				atan_prev: 		atan_prev,
				atan_next: 		atan_next
			} );
			
			// Normalize angles to 
			var n_prev = constants.normalize_angle(atan_prev);
			var n_next = constants.normalize_angle(atan_next);
			var total_angle = n_next < n_prev ? ( 2 * Math.PI ) - ( Math.abs( n_next - n_prev ) ) : Math.abs( n_next - n_prev );
			
			self._log( 'normalised angles', {
				n_prev: 	n_prev,
				n_next: 	n_next,
				n_prev_deg: Snap.deg(n_prev),
				n_next_deg: Snap.deg(n_next),
				total: 		total_angle,
				total_deg:	Snap.deg(total_angle)
			} );
			
			if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
				var from = -( 2 * Math.PI - n_prev );
				self.__debug_group.add( constants.draw_pie_sector( self.__snap, {x:0, y:0}, 0, d_next, Snap.deg(from), Snap.deg(total_angle), {
					stroke:	'#00FF00',
					fill: 	'none'
				} ) );
			};
			return {
				prev: n_prev,
				next: n_next,
				total: total_angle
			};
		},
		
		get_radius: function() {
			return this.__radius;
		},
		
		set_center: function(x, y) {
			this.__x = x;
			this.__y = y;
		},
		set_radius: function(radius) {
			this.__radius = radius;
		},
		
		/**
		 * Add elements to the SVG with
		 * initial values
		 */
		init: function(args) {
			var self = this;
			args = args || {};

			var prevent_breadth_descent = args.prevent_breadth_descent || false;
			
			// Layers
			self.__text_group = self.__snap.group();
			self.__group = self.__snap.group();
			
			if( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
				self.__debug_group = self.__snap.group();
				self.__debug_group.attr( 'visibility', 'hidden' );
			}
			
			// Line
			if ( self.__parent) {
				self.__line_start = constants.get_point_on_circle( 0, 0, self.__x, self.__y, self.__parent.get_radius() );
				self._log('adding line to', self);
				self.__line = self.__snap.line( self.__line_start.x, self.__line_start.y, self.__line_start.x, self.__line_start.y  );
				self.__line.attr({
					strokeWidth: 1,
					stroke: Snap.rgb(120,120,120)
				});
			};
			
			// Circle
			var circle = self.__snap.circle( 0, 0, self.__radius );
			self.__circle = circle;
			circle.attr({ style: jss_compiler.compile( self.__circle_jss ) });
			
			// Label
			var text = self.__snap.multitext( 0, 0, self.__name, self.__radius * 2 );
			self.__text = text;
			text.attr({
				style: jss_compiler.compile( self.__text_jss )
			});
			
			// Add elements to layers
			self.__group.add( circle);
			self.__text_group.add(text);
			if ( self.__parent ) {
				self.__parent.get_group().add( self.__group );
				self.__parent.get_group().add( self.__line );
				self.__parent.get_text_group().add( self.__text_group );
				
				if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
					self.__parent.get_debug_group().add( self.__debug_group );
				}
			};
			
			// Hide
			self.__group.attr( 'visibility', 'hidden' );
			self.__text_group.attr( 'visibility', 'hidden' );

			// Click binding
			circle.click( function() {
				self.__clicked();
			} )
			text.click( function() {
				self.__clicked();
			} );
			
			// Init next
			if ( !prevent_breadth_descent ) {
				self._log(  'init:: descending to next' );
				var next = self.__get_next_bubble( {
					breadth_only: true
				} );
				if (next) next.init();
			};
			
			// Init children
			self.__init_children();
			
			// Continue to first child
			if ( self.__children && self.__children.length ) {
				self._log(  'init:: descending to first child' );
				self.__children[0].init();
			}
			
			return;
		},
		
		__get_transform_str: function(pos, scale) {
			return 'translate(' + pos.x +','+pos.y+') scale(' + scale +')';
		},
		
		/**
		 * Show this element and the line to its parent
		 */
		show: function(args) {
			var self = this;
			var args = args || {};
			var hide = args.hide || false;
			
			self.__group.attr( 'visibility', 'inherit' );
			self.__text_group.attr( 'visibility', 'inherit' );
			
			if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
				self.__debug_group.attr( 'visibility', 'inherit' );
			}
			
			var end_transform = self.__get_transform_str( { x: self.__x, y: self.__y }, 1 );
			
			// Root nodes
			if (args.skip_animation) {
				
				self.__group.attr({
					transform: end_transform
				});
				self.__text_group.attr({
					transform: end_transform
				});
				if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
					self.__debug_group.attr({
						transform: end_transform
					});
				}
			}
			else {
				
				var start = constants.get_point_on_circle( 0, 0, self.__x, self.__y, self.__parent.get_radius() );
				var initial_transform = self.__get_transform_str( start, 0 );
				// Initial values
				self.__group.attr({
					transform: initial_transform
				});
				self.__text_group.attr({
					transform: initial_transform
				});
				
				if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
					self.__debug_group.attr({
						transform: initial_transform
					});
				}
				
				if (self.__line) {
					self.__line_end = constants.get_point_on_circle(
							0, 0, self.__x,self.__y,
							constants.get_distance(0 , 0, self.__x, self.__y) - self.__radius );
					self.__line.animate({
						y2: self.__line_end.y,
						x2: self.__line_end.x	
					}, SHOW_SPEED, mina.easeout );
				}
				
				self.__group.animate({
					transform: end_transform
				}, SHOW_SPEED, mina.easeout );
				self.__text_group.animate({
					transform: end_transform
				}, SHOW_SPEED, mina.easeout );
				
				if( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
					self.__debug_group.animate({
						transform: end_transform
					}, SHOW_SPEED, mina.easeout );
				}

			};
			
			return;
		},
		
		hide: function() {
			var self = this;
			self._log( 'hide start: ' + self.__name );
			
			var deferred = new Deferred();
			
			self.close().then(function() {
				if ( self.__group ) {
					
					var start_transform = self.__get_transform_str({x: self.__x, y: self.__y}, 1);
					var end_pos = constants.get_point_on_circle( 0, 0, self.__x, self.__y, self.__parent.get_radius() );
					var end_transform = self.__get_transform_str(end_pos, 0);
					
					if ( is_debug_scope_enabled(LAYOUT_SCOPE) ) {
						self.__debug_group.attr(  'visibility', 'hidden' );
					}
					
					self.__text_group.animate({
						transform: end_transform
					}, HIDE_SPEED, mina.easeout, function() {
						self.__text_group.attr( 'visibility', 'hidden' );
					});
					self.__group.animate({
						transform: end_transform
					}, HIDE_SPEED, mina.easeout, function() {
						self._log( 'hide complete: ' + self.__name );
						self.__group.attr( 'visibility', 'hidden' );
						deferred.resolve();
					});
					self.__line.animate( {
						y2: self.__line_start.y,
						x2: self.__line_start.x	
					}, HIDE_SPEED, mina.easeout );
				}
				else {
					deferred.resolve();
				}
			}, function(error) {
				self._log_warn('close failed', error);
			});
			
			return deferred;
		},
		
		__hide_children: function() {
			var self = this;
			
			if(!self.__children) return new Deferred().resolve();
			if(!self.__is_open) return new Deferred().resolve();
			
			var queue = new EagerQueue();
			array.forEach( self.__children, function(child) {
				queue.enqueue( function(deferred) {
					child.hide().then( function(result) {
						deferred.resolve(result);
					}, function(error) {
						self._log_warn('error hiding child', error);
					} );
				});
			} );
			queue.finish();
			return queue.dequeue_all();
		},
		
		
		get_debug_group: function() {
			return this.__debug_group;
		},
		get_text_group: function() {
			return this.__text_group;
		},
		
		get_group: function() {
			return this.__group;
		},
		
		__get_child_radius: function() {
			return 75 - (this.__depth) * 10;
		},
		
		__get_child_overlap: function() {
			return Math.PI / ((this.__depth + 1) * 40);
		},
		
		__init_children: function() {
			var self = this;
			self._log( '__init_children');
			
			if ( !self.__children || !self.__children.length ) return;
			
			// Find the child positions
			var child_radius = self.__get_child_radius();
			
			// FIXME depend on depth?
			var padding_rad = Math.PI / 60;
			var overlap = self.__get_child_overlap();
			
			var center = self.get_center();
			var angles = self.__get_available_angle();
			
			var total_angle = angles.total;
			total_angle += overlap * 2;
			
			// Find how much radians we have available per child
			var total_pad = padding_rad * ( self.__children.length + 1 );
			var available_angle = total_angle - total_pad;
			var angle_for_circle = available_angle / self.__children.length;
			
			var min_radius = self.__radius + Math.tan(padding_rad)*(self.__radius+child_radius) + child_radius + 20;
			
			// Calculate what radius we need to space
			// the circles at the required size
			var orbit_radius = 2*child_radius / Math.sin( angle_for_circle );
//			if ( orbit_radius < min_radius + child_radius ) orbit_radius = min_radius;
			
			// Starting and ending points
			var start = angles.prev;
			var end = start + total_angle;
			
			self._log( 'adding circles', {
				children: 	self.__children.length,
				child_radius: 	child_radius,
				padding: 		padding_rad,
				orbit_radius: 	orbit_radius,
				
				total_angle: 		total_angle,
				angle_for_circle: 	angle_for_circle,
				
				start: 	start,
				end: 	end
			} );
			
			var index = 0;
			var alpha = start + padding_rad + angle_for_circle / 2 - overlap;
			var step = padding_rad + angle_for_circle;
			
			// Set child bubble initial values and call init
			for ( var i = 0; i < self.__children.length; i++ ) {
				var bubble = self.__children[i];
				
				var angle = alpha + i * step;
				var bubble_x = 0 + orbit_radius * Math.cos(angle);
				var bubble_y = 0 + orbit_radius * Math.sin(angle);
				
				self._log( 'setting child center', {
					angle: angle,
					x: bubble_x,
					y: bubble_y,
					selfx: self.__x,
					selfy: self.__y
				} );

				bubble.set_center( bubble_x, bubble_y );
				bubble.set_radius( child_radius );
			}
			
			if (  is_debug_scope_enabled(LAYOUT_SCOPE)  ) {
				// Starting position
				var start_x = orbit_radius * Math.cos(angles.prev);
				var start_y = orbit_radius * Math.sin(angles.prev);
				self.__debug_group.add( self.__snap.circle( start_x, start_y, 5 ).attr( {
					stroke: 'cyan',
					strokeWidth: 1
				} ) );
				// Visualize orbit
				self.__debug_group.add( self.__snap.circle( 0, 0, orbit_radius ).attr( {
					fill: 'none',
					stroke: '#00FF00',
					strokeWidth: 1
				} ) );
			}
			
			return;
		},
		
		__is_selected: false,
		__is_open: false,
		
		is_selected: function() {
			return this.__is_selected;
		},
		is_open: function() {
			return this.__is_open;
		},
		
		__set_is_open: function(is_open) {
			var self = this;
			self.__is_open = is_open;
			self.__refresh_active_style();
			return;
		},
		
		open: function() {
			var self = this;
			self.__set_is_open(true);
			if (self.__children) {
				array.forEach( self.__children, function(child) {
					child.show();
				});
			}
			return;
		},
		
		close: function() {
			var self = this;
			var deferred = self.__hide_children();
			self.__set_is_open(false);
			return deferred;
		},
		
		/**
		 * Replaces existing style
		 */
		__replace_style: function(element, replacing_jss) {
			var existing_style_str = element.attr('style');
			var existing_style_hash = jss_compiler.decompile(existing_style_str)
			var new_style_hash = lang.mixin( existing_style_hash, replacing_jss );
			var style_str = jss_compiler.compile(new_style_hash);
			element.attr('style', style_str);
			return;
		},
		
		__refresh_active_style: function() {
			var self = this;
			if ( self.__is_selected || self.__is_open ) {
				self.__replace_style( self.__circle, selected_circle_jss );
				self.__replace_style( self.__text, selected_text_jss );
			}
			else {
				self.__replace_style( self.__circle, self.__circle_jss );
				self.__replace_style( self.__text, self.__text_jss );
			}
			return;
		},
		
		/**
		 * Set the selected status of this node
		 */
		__set_selected: function(is_selected) {
			var self = this;
			self.__is_selected = is_selected;
			self.__refresh_active_style();
			
			self._log( self.get_name() + ' selected : ' + self.__is_selected );
			return;
		},
		
		select: function() {
			this.__set_selected(true);
		},
		
		deselect: function() {
			this.__set_selected(false);
		},
		
		__clicked: function() {
			var self = this;
			self._log(  'clicked ' + self.__name );
			self.__app.on_click(self);
			
			return;
		}
	});
});