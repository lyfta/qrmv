// (c) 2017 Tom Engström for Lyfta
// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	
	'quantum/Deferred',
	'quantum/_Debug',
	
	'horizon/portable/LaidOut',
	'horizon/portable/CappedSizeLaidOut',
	
	'whitespace/portable/_HasResources',
	'whitespace/portable/Image',
	
	'qrmv/style/position'
], function(
	require,
	declare,
	
	Deferred,
	_Debug,
	
	LaidOut,
	CappedSizeLaidOut,
	
	_HasResources,
	Image,
	
	position
) {
	
	return declare( [ CappedSizeLaidOut, _Debug, _HasResources ], {
		_PORTABLE_CLASS: 'qrmv/portable/Logo',
		
		constructor: function() {
			var self = this;
			//self.enable_debug();
			
			var args = self._get_portable_args();
			
			self.__image_key = args.image_key || 'logo';
			self._log('constructed');
			self.__max_width = args.max_width;
			
			self._use_resources(490592781);
			return;
		},
		
		_layout_apply: function(ev) {
			var self = this;
			var dom_tools = self._get_dom_tools();
			dom_tools.set_jss( self.domNode, {
				'max-width': self.__max_width + 'px'
			});
			return self.inherited(arguments);
		},
		
		_layout_populate: function(ev) {
			var self = this;
			
			var session = self._get_session();
			var dom_tools = self._get_dom_tools();
			
			var deferred = new Deferred();
			var reject = function() {
				deferred.resolve();
			};
			
			var language = session.get_language();
			self._get_resource( self.__image_key, language ).then_apply( function(logo) {

				if (!logo) {
					self._log('no logo');
					return;
				};
				
				var image = new Image( {
					record: logo,
					session: session,
					preserve_aspect_ratio: true
				} );
				
				self.layout_place( image );
				deferred.resolve();
			}, reject );
			
			return deferred;
		}
		
	});

});
