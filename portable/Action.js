// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/aspect',
	'quantum/_Debug',
	'quantum/Deferred',
	'quantum/class-loader',
	
	'horizon/portable/LaidOut',
	'horizon/portable/PulsatingLaidOut',
	'whitespace/portable/_HasResources',
	'whitespace/portable/Image'
], function(
	require,
	declare,
	aspect,
	
	_Debug,
	Deferred,
	class_loader,
	
	LaidOut,
	PulsatingLaidOut,
	_HasResources,
	Image
) {

	var SIZE = 25;
	
	var Action = declare( [ LaidOut, _HasResources, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/Action',
		
		constructor: function() {
			var self = this;
			//self.enable_debug();
			var args = self._get_portable_args();
			self.__key = args.key || self._confess('need key');
			self.__fill = args.fill || 'ffffff';
			self._use_resources(490592781);
			return;
		},
		
		on_click: function() {},
		
		_layout_apply: function(event) {
			var self = this;
			var clone = event.clone();
			clone.set_width(SIZE);
			clone.set_visible_height(SIZE);
			return self._layout_propagate(clone);
		},
		
		set_rotation: function(degrees) {
			var self = this;
			var dom_tools = self._get_dom_tools();
			dom_tools.extend_jss( self.domNode, {
				transform: 'rotate(' + degrees + 'deg)'
			} );
			return;
		},
		
		_layout_populate: function() {
			var self = this;
			var deferred = new Deferred();
			var reject = function(error) { deferred.reject(error); }
			
			var session = self._get_session();
			var language = session.get_language();
			var key = self.__key;
			
			var get_title = self._get_resource( key + '_title', language );
			
			var dom_tools = self._get_dom_tools();
			dom_tools.extend_jss( self.domNode, { // extend because might have rotation already
				'cursor': 'pointer',
				'width': SIZE+'px',
				'height': SIZE+'px'
			} );
			
			var wrapper = new PulsatingLaidOut( { session: session } );
			self.layout_place(wrapper);
			self.set_portable_attachment( 'wrapper', wrapper );
			
			self._get_resource( key + '_icon', language ).then_apply( function(icon) {
				get_title.then( function(title) {
					var image = new Image( {
						record: icon,
						session: session,
						title: title,
						colorize: 100,
						fill: self.__fill
					} );
					wrapper.layout_place(image);
					deferred.resolve();
				}, reject );
			}, reject );

			return deferred;
		},
		
		_layout_startup: function(ev) {
			var self = this;
			self._log('_layout_startup qrmv/portable/Action');
			
			var wrapper = self.get_portable_attachment('wrapper');
			var session = self._get_session();
			self.own( aspect.after( session, 'set_selected_id', function() {
				wrapper.stop_pulsating();
			} ) );

			class_loader.require('horizon/event/ClickListener').then( function(ClickListener) {
				self._log('adding clicklistener');
				self.own( new ClickListener({
					node: self.domNode,
					callback: function() {
						self._log('on_click');
						wrapper.start_pulsating();
						self.on_click();
					}
				} ) );
			}, self._not_reached );
			
			return self.inherited(arguments);
		}
		
	} );
	
	Action.SIZE = SIZE;
	return Action;
	
} );
