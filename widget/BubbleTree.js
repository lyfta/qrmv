define([
	'require',
	'dojo/dom',
	'dojo/dom-geometry',
	
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/on',
	'dojo/window',
	
	'quantum/_Debug', 
	'quantum/deferred/EagerQueue',

	'qrmv/facade/Topic',
	'qrmv/style/color',
	'qrmv/constants',
	'qrmv/Bubble',
	'snap',
	
	'dojo/NodeList-dom',
	'dojo/NodeList-traverse'
], function(
	require,
	dom,
	dom_geometry,
	
	declare,
	array,
	lang,
	on_event,
	win,
	
	_Debug,
	EagerQueue,
	
	Topic,
	style_color,
	constants,
	Bubble,
	Snap
) {
	
	var UI_SCOPE = 'app-ui';
	var CENTER_SCOPE = 'app-center';
	
	var DEBUG_ENABLED_FOR = {};
	DEBUG_ENABLED_FOR[UI_SCOPE] = false;
	DEBUG_ENABLED_FOR[CENTER_SCOPE] = false;
	var is_debug_scope_enabled = function(scope) {
		return DEBUG_ENABLED_FOR[scope];
	};
	
	// Snap plugin for toggling / removing / adding classes
	Snap.plugin( function (Snap, Element, Paper, glob) {
		var whitespace = /[\x20\t\r\n\f]+/g;
		
		// Toggle specified class name
		Element.prototype.toggle_class = function( class_name, is_add ) {
			self._log('toggle class ' + class_name + ' ' + is_add, this );
			var current = this.node.attr('class');

			if ( current.indexOf(class_name) ) {
				if (!is_add) {
					var first_part = current.substr( 0, current.indexOf(class_name) );
					var last_part = current.substr( current.indexOf(class_name) + class_name.length, current.length - 1 );
					this.attr( 'class', first_part + last_part.trim() );
				}
			}
			else if (is_add) {
				this.node.attr( 'class', current + ' ' + class_name );
			}
			return;
		};
	});

	// Snap plugin for adding multiline text svg elements
	Snap.plugin( function (Snap, Element, Paper, glob) {
		Paper.prototype.multitext = function (x, y, txt, max_width, attributes) {
			var svg = Snap();
			if (!attributes) attributes = {};
	        var abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	        var temp = svg.text(0, 0, abc);
	        temp.attr(attributes);
	        var letter_width = temp.getBBox().width / abc.length;
	        svg.remove();

	        var words = txt.split(" ");
	        var width_so_far = 0, current_line=0, lines=[''];
	        for (var i = 0; i < words.length; i++) {

	           var l = words[i].length;
	           if (width_so_far + (l * letter_width) > max_width) {
	              lines.push('');
	              current_line++;
	              width_so_far = 0;
	           }
	           width_so_far += l * letter_width;
	           lines[current_line] += words[i] + " ";
	        }

	        var t = this.text(x,y,lines).attr(attributes);
	        t.selectAll("tspan:nth-child(n+2)").attr( {
	           dy: "1.2em",
	           x: x
	        } );
	        return t;
		};
	});
	
	var get_prototype_data = function() {
		// Prototype data
		var lvl_1 = [ 'Techniques', 'Philosophies', 'Approaches',
				'Traditions' ];
		var lvl_2 = [ 'Quality of Data', 'Data Collection',
				'Analysis', 'Sampling' ];
		var lvl_3 = [ 'Experiments', 'Surveys',
				'Archival Research', 'Observations', 'Interviews' ];

		// Create prototype data structure
		var root = {
			children: [ ]
		};
		array.forEach( lvl_1, function( node_name ) {
			var node = {
				name: node_name
			};
			if ( node_name == 'Techniques' ) {
				node.children = [];
				array.forEach( lvl_2, function( node_2_name ) {
					var node_2 = {
						name: node_2_name,
						parent: node_name
					};

					if ( node_2_name == 'Data Collection' ) {
						node_2.children = [];
						array.forEach( lvl_3, function( node_3_name ) {
							var node_3 = {
								name: node_3_name,
								parent:	node_2_name
							};
							node_2.children.push(node_3);
						} );
					};
					node.children.push(node_2);

				});
			}
			root.children.push(node);
		} );
		return root;
	};
	
	
	return declare( [_Debug], {
		
		constructor: function(args) {
			var self = this;
			//self.enable_debug();
			
			self.__svg_node_id = args.svg_node_id;
			self.__topics_data = args.topics;
			
			self._log('constructed BubbleTree', {
				object: self,
				args: args
			});
			
			self.__initialize();
			
			return;
		},

		on_bubble_open: function(bubble) {},
		on_bubble_close: function(bubble) {},
		
		// Clicked a bubble
		on_click: function(bubble) {
			var self = this;

			if ( is_debug_scope_enabled(UI_SCOPE) ) {
				var selected_name = self.__selected_bubble ? self.__selected_bubble.get_name() : 'root';
				self._log('select', {
					bubble: bubble.get_name(),
					selected: selected_name
				} );
				self._log(' bubbles', {
					new_bubble: bubble,
					selected: self.__selected_bubble
				} );
			}
			
			// Clicked on a selected bubble
			// just select parent
			if ( bubble.is_selected() ) {
				self._log('unselected node');
				bubble.close();
				bubble.deselect();
				
				self.on_bubble_close(bubble);
				
				// Select parent 
				self.__set_selected_bubble( bubble.get_parent() );
				if (self.__selected_bubble) {
					// If parent is not null, select it
					self.__selected_bubble.select();
				}
				
				return;
			}
			
			// Selected bubble is something else
			if ( self.__selected_bubble ) {
				
				self.__selected_bubble.deselect();
				bubble.select();
				
				// Clicked sibling
				if ( bubble.get_depth() == self.__selected_bubble.get_depth() ) {
					self._log('selected node with equal depth (sibling)');
					self.__selected_bubble.close();
					bubble.open();
					self.__set_selected_bubble(bubble);
					self.on_bubble_open(bubble);
					return;
				}
				
				// Clicked a node higher up
				if ( bubble.get_depth() < self.__selected_bubble.get_depth() ) {
					self._log('selected node with smaller depth' );
					var parent = self.__selected_bubble.get_parent();
					var child = self.__selected_bubble;
					
					var found_direct_ancestor = false;
					var found_cousin = false;
					
					while (parent) {
						if ( parent == bubble ) {
							found_direct_ancestor = true;
							break;
						}
						if ( parent == bubble.get_parent() ) {
							found_cousin = true;
							break;
						}
						child = parent;
						parent = parent.get_parent();
					}
					
					if ( found_cousin ) {
						// Clicked on a bubble sharing an ancestor with current
						child.close();
						self.__selected_bubble.deselect();
						bubble.open();
						self.__set_selected_bubble(bubble);
						self.on_bubble_open(bubble);
						return;
					}
					
					if (found_direct_ancestor) {
						// Clicked on a direct ancestor
						child.close();
						self.__selected_bubble.deselect();
						self.__set_selected_bubble(bubble);
						self.on_bubble_open(bubble);
						return;
					}
					
					// Different tree, close old tree
					child.close();
					self.__selected_bubble.deselect();
					bubble.open();
					self.__set_selected_bubble(bubble);
					self.on_bubble_open(bubble);
					return;
				};
				
				// Child in current tree
				bubble.open();
				self.__set_selected_bubble(bubble);
				self.on_bubble_open(bubble);
				return;
			};

			// Clicked a root
			bubble.select();
			bubble.open();
			self.__set_selected_bubble(bubble);
			self.on_bubble_open(bubble);

			self._log(  'selected bubble', bubble );
			return;
		},
		
		__set_selected_bubble: function(new_bubble) {
			var self = this;
			self.__selected_bubble = new_bubble;
			self.__center_selected_element();
			return;
		},
		
		center_selected_element: function() {
			this.__center_selected_element();
		},

		__center_selected_element: function(args) {
			var self = this;
			args = args || {};
			var skip_animation = args.skip_animation || false;
			
			var selected_element = self.__selected_bubble ? self.__selected_bubble.get_group() : self.__circle_layer;
			
			if(selected_element) {
				self._log( 'selected element', {
					selected_element: selected_element,
					bubble: self.__selected_bubble,
					circle: self.__circle_layer
				});
//				self._log( 'selected element transform matrix', selected_element.transform() );
			}

			// Position offset from center;
			// this is the sum of the local matrixes
			// from selected bubble up to the topmost ancestor
			var x_offset = 0;
			var y_offset = 0;
			
			if (self.__selected_bubble) {
				var bubble = self.__selected_bubble;
				while (bubble) {
					var matrix = bubble.get_group().transform().localMatrix;
					x_offset += matrix.e;
					y_offset += matrix.f;
					bubble = bubble.get_parent();
				}
			};

			self._log( 'got offsets', {
				x: x_offset,
				y: y_offset
			});
			
			var parent_w = self.__get_parent_position().w;
			var parent_h = self.__get_parent_position().h;
			
			var final_x = parent_w / 2 - x_offset;
			var final_y = parent_h / 2 - y_offset;
			
			if ( is_debug_scope_enabled(CENTER_SCOPE) ) {
				if (!self.__selected_center_point) self.__selected_center_point = self.__snap.circle( 0,0,5 );
				self.__selected_center_point.attr( {
					cx: parent_w / 2 + x_offset,
					cy: parent_h / 2 + y_offset
				} );
			};
			
			if ( !skip_animation ) {
				self.__circle_layer.animate({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				}, 400, mina.easein);
				self.__text_layer.animate({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				}, 400, mina.easein);
				self.__debug_layer.animate({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				}, 400, mina.easein);
			}
			else {
				self.__circle_layer.attr({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				});
				self.__text_layer.attr({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				});
				self.__debug_layer.attr({
					transform: 'translate(' + final_x +  ','+ final_y + ')'
				});
			}
			
			return;
		},
		
		__get_parent_position: function() {
			var self = this;
			var svg_node = dom.byId(self.__svg_node_id);
			self._log('__get_parent_position', svg_node);
			return dom_geometry.position( svg_node.parentNode );
		},
		
		__initialize : function() {
			var self = this;
			self.__snap = Snap( '#' + self.__svg_node_id );
			self._log('snap', self.__snap );
			
			self.__snap.attr( 'width', Math.floor(self.__get_parent_position().w) );
			self.__snap.attr( 'height', Math.floor(self.__get_parent_position().h) );
			
			self.__circle_layer = self.__snap.group();
			self.__text_layer = self.__snap.group();
			
			self.__debug_layer = self.__snap.group();
			
			var center_group = function() {
				var x_offset = self.__get_parent_position().w / 2;
				var y_offset = self.__get_parent_position().h / 2;
				var transform_str = 'translate(' + x_offset +  ','+ y_offset + ')';
				self.__circle_layer.attr( {
					transform: transform_str
				} );
				self.__text_layer.attr( {
					transform: transform_str
				} );
				// For Debug
				self.__debug_layer.attr( {
					transform: transform_str
				} );
			};
			
			var resize = function() {
				var svg_node = dom.byId(self.__svg_node_id);
				if ( !svg_node || !svg_node.parentNode ) {
					return;
				}
				
				var parent_w = Math.floor(self.__get_parent_position().w);
				var parent_h = Math.floor(self.__get_parent_position().h);
				self.__snap.attr( 'width', parent_w );
				self.__snap.attr( 'height', parent_h );
				self.__snap.attr( 'viewbox', '0 0 ' + parent_w + ' ' + parent_h );
				self.__center_selected_element({
					skip_animation: false
				});
			};
			self.resize_svg_node = resize;
			
			center_group();
			
			// Recursive function for creating the bubble data structure
			var create_bubble = function( topic, bubble_args ) {
				var args = lang.mixin( {
					name: topic.name,
					record: topic.record,
					snap: self.__snap,
					app: self
				}, bubble_args );
				
				self._log('creating bubble', {
					topic: topic,
					bubble_args: bubble_args,
					args: args
				} );
				var bubble = new Bubble(args);
				
				var depth = bubble_args.depth + 1;
				
				// Add any children if they exist
				if ( topic.subtopics ) {
					array.forEach( topic.subtopics, function( subtopic ) {
						bubble.add_child( create_bubble( subtopic, { parent: bubble, depth: depth } ) );
					} );
				}
				return bubble;
			};
			
			var root_bubbles = [];
			
			// Parse the data and make bubbles based on it
			array.forEach( self.__topics_data.subtopics, function( topic, root_index ) {
				
				// Figure out placement for initial nodes
				// as well as color
				var x_offset, y_offset, fill_color, text_x_offset, text_y_offset;
				switch (root_index) {
				case 0:
					fill_color = style_color.red;
					x_offset = 1;
					y_offset = 0;
					text_x_offset = 20;
					text_y_offset = 0;
					break;
				case 1:
					fill_color = style_color.green;
					x_offset = 0;
					y_offset = 1;
					text_x_offset = 0;
					text_y_offset = 20;
					break;
				case 2:
					fill_color = style_color.blue;
					x_offset = -1;
					y_offset = 0;
					text_x_offset = -20;
					text_y_offset = 0;
					break;
				case 3:
				default:
					fill_color = style_color.yellow;
					x_offset = 0;
					y_offset = -1;
					text_x_offset = 0;
					text_y_offset = -10;
					break;
				};
				
				var x = x_offset * 100;
				var y = y_offset * 100;
				var radius = 110;
				
				var root_bubble = create_bubble( topic, {
					x: x,
					y: y,
					depth: 0,
					radius: radius,
					circle_jss: {
						fill: fill_color
					},
					text_jss: {
						'text-transform': 'uppercase',
						'transform': 'translate(' + text_x_offset + 'px, ' + text_y_offset + 'px)'
					}
				});
				root_bubbles.push(root_bubble);
			} );
			
			array.forEach( root_bubbles, function( bubble, index ) {
				self._log('setting siblings for ' + index );
				var next = ( index < root_bubbles.length - 1) ? root_bubbles[index+1] : root_bubbles[0];
				var prev = ( index == 0) ? root_bubbles[root_bubbles.length - 1] : root_bubbles[index-1];

				// Set next and previous to find tangents
				bubble.set_previous_sibling(prev);
				bubble.set_next_sibling(next);
				bubble.init({
					// Prevent breadth so we don't call init twice
					prevent_breadth_descent: true
				});
				bubble.get_group().addClass('root-bubble');
				bubble.get_text_group().addClass('root-bubble-text');
				
				bubble.show({ skip_animation: true });

				self.__circle_layer.append( bubble.get_group() );
				self.__text_layer.append( bubble.get_text_group() );
				self.__debug_layer.append( bubble.get_debug_group() );
				
			});
				
			return;
		}
		
	} );
});