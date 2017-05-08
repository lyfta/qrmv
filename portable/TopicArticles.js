// (c) 2017 Tom Engström for Lyfta
// (c) 2017 Sam Engström for Lyfta
define( [
	'require',
	'dojo/_base/declare',
	'dojo/_base/array',

	'quantum/_Debug',
	'quantum/Deferred',
	'quantum/class-loader',
	
	'horizon/portable/LaidOut',
	'horizon/portable/PulsatingLaidOut',
	'horizon/portable/LaidOutContainer',
	'horizon/style/Text',
	
	'materia/FieldSpec',

	'whitespace/portable/RecordLink',
	'whitespace/portable/RecordName',
	'whitespace/portable/field/ValueDiv',
	'whitespace/portable/_HasRecordArgs',

	'qrmv/facade/Category',
	'qrmv/facade/Topic',
	'qrmv/facade/Article',
	
	'qrmv/constants',
	'qrmv/style/color',
	'qrmv/style/type'
], function(
	require,
	declare,
	array,
	
	_Debug,
	Deferred,
	class_loader,
	
	LaidOut,
	PulsatingLaidOut,
	LaidOutContainer,
	TextStyle,
	
	FieldSpec,
	
	RecordLink,
	RecordName,
	ValueDiv,
	_HasRecordArgs,
	
	Category,
	Topic,
	Article,
	
	qrmv_constants,
	color,
	type
) {
	
	return declare( [ LaidOut, _HasRecordArgs, _Debug ], {
		
		_PORTABLE_CLASS: 'qrmv/portable/TopicArticles',
		
		constructor: function() {
			var self = this;
			
			//self.enable_debug();
			
			var args = self._get_portable_args();
			self.__selected_article = args.selected_article;
			self.__record = args.record;
			self.__get_articles_of = {};
			
			return;
		},
		
		_layout_apply: function(ev) {
			var self = this;

			var clone = ev.clone();
			
			var article_style_args = qrmv_constants.jss_to_text_style_args( type.article_name );
			var category_style_args = qrmv_constants.jss_to_text_style_args( type.category_name );
			var article_selected_style_args = qrmv_constants.jss_to_text_style_args( type.article_name );
			//article_selected_style_args.background = color.red;
			article_selected_style_args.color = color.white;

			clone.set_style( 'qrmv_accordion', {
				'article_name--selected': 	new TextStyle(article_selected_style_args),
				article_name: 				new TextStyle(article_style_args),
				category_name: 				new TextStyle(category_style_args),
			} );
			
			// Returning from detached
			var dom_tools = self._get_dom_tools();
			if ( !self.get_latest_layout_event() && dom_tools.window ) {
				setTimeout( function() {
					self.__expand_selection();
				}, 0 );
			}

			return self._layout_propagate(clone);
		},
		
		_layout_populate: function(ev) {
			var self = this;
			
			var dom_tools = self._get_dom_tools();
			var session = self._get_session();
			var ui_language = session.get_language();
			var record = self.__record;
			
			self._log('_layout_startup', {
				record: record
			});
			
			// Main container
			var container = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				style_type: 'invisible',
				child_style_type: 'article'
			} );
			self.layout_place(container);
			
			// Associated articles
			// Title
			var article_title_div = new ValueDiv( {
				session: session,
				field_spec: new FieldSpec( {
					record: 	session.get_broker().get(qrmv_constants.RESOURCE_OBJECT_ID),
					name: 		'associated_articles',
					language: 	ui_language
				} ),
				ui_language: ui_language
			} );
			container.push(article_title_div);
			dom_tools.set_jss( article_title_div.domNode, type.subheading );
			
			var category_container = new LaidOutContainer( {
				session: 			session,
				horizontal_only: 	true,
				style_type: 		'invisible',
				child_style_type: 	'article'
			} );
			container.push( category_container );
			self.set_portable_attachment( 'category_container', category_container );
			
			return self.inherited(arguments);
		},
		
		__get_articles: function(category_record) {
			var self = this;
			var id = category_record.get_id();
			if ( self.__get_articles_of[id] ) return self.__get_articles_of[id];
			var deferred = new Deferred();
			self.__get_articles_of[id] = deferred;
			var reject = function(error) { deferred.reject(error); }

			var session = self._get_session();
			var ui_language = self.__ui_language;

			var article_container = new LaidOutContainer( {
				session: session,
				horizontal_only: true,
				style_type: 'invisible',
				child_style_type: 'paragraph'
			} );
			
			category_record.get_facade(Category).get_articles().then( function(articles) {
				self._log( 'got articles', articles );
				array.forEach( articles, function( article, index ) {
					var article_name_container = new LaidOutContainer( {
						session: session,
						min_width: 20,
						style_type: 'invisible',
						child_style_type: 'paragraph'
					} );

					var article_style_key = article === self.__selected_article ? 'article_name--selected' : 'article_name';
					var article_name = new RecordName( {
						session: session,
						record: article,
						prefix: ( index + 1 ) + '. ',
						style_type: 'qrmv_accordion',
						style_key: article_style_key,
						preferred_language: ui_language,
					} );
					var article_link = new RecordLink( {
						session: session,
						record: article,
						preferred_language: ui_language,
						text_decoration: 'inherit',
						color: 'inherit'
					} );
					
					article_link.layout_place(article_name);
					//article_name_container.push(article_number);
					article_name_container.push(article_link);
					article_container.push(article_name_container);
				} );
				deferred.resolve(article_container);
			}, function(error) {
				self._log_warn( 'error getting articles', error );
				deferred.resolve(article_container);
			} );
			return deferred;
		},
		
		__expand_selection: function() {
			var self = this;
			var selected_article = self.__selected_article;
			if (!selected_article) return;
			var facade = selected_article.get_facade(Article);
			facade.get_parent_categories().then( function(parent_categories) {

				var category_container = self.get_portable_attachment('category_container');
				var category_wrappers = category_container.get_children();
				array.forEach( category_wrappers, function(category_wrapper) {
					var pulsating_wrapper = ( category_wrapper.get_layout_children() )[0];
					var category_name = ( pulsating_wrapper.get_layout_children() )[0];
					
					// Skip already expanded articles
					if (!category_name.get_record) return;

					var category_record = category_name.get_record();
					if ( array.some( parent_categories, function(c) { return c === category_record; } ) ) {
						pulsating_wrapper.start_pulsating();
						self.__get_articles(category_record).then( function(article_container) {
							if ( category_container.layout_contains(article_container) ) {
								// Not doing anything here
							}
							else {
								category_container.place_after( category_wrapper, article_container );
							}
							pulsating_wrapper.stop_pulsating();
						}, self._not_reached );
					}
				} );
			}, function(error) {
				self._log_warn( 'error getting parent categories', error );
			} );
			return;
		},

		_layout_startup: function() {
			var self = this;
			
			var record = self.__record;
			var session = self._get_session();
			var ui_language = session.get_language();

			var req_click_listener = class_loader.require('horizon/event/ClickListener');
			var dom_tools = self._get_dom_tools();

			var category_container = self.get_portable_attachment('category_container');
			category_container.set_transition( 'wipe', 200 );

			record.get_facade(Topic).get_article_categories().then( function(categories) {
				self._log( 'got categories', categories );
				var click_wrappers = [];
				array.forEach( categories, function(category_record) {
					var click_wrapper = new LaidOut( { session: session } );
					var pulsating_wrapper = new PulsatingLaidOut( { session: session } );
					var category_name = new RecordName( {
						session: session,
						record: category_record,
						style_type: 'qrmv_accordion',
						style_key: 'category_name',
						preferred_language: ui_language
					} );
					pulsating_wrapper.layout_place(category_name);
					click_wrapper.layout_place(pulsating_wrapper);
					click_wrappers.push(click_wrapper);
					
					req_click_listener.then( function(ClickListener) {
						self.own( new ClickListener( {
							node: click_wrapper.domNode,
							callback: function() {
								pulsating_wrapper.start_pulsating();
								self.__get_articles(category_record).then( function(article_container) {
									if ( category_container.layout_contains(article_container) ) {
										category_container.remove(article_container);
									}
									else {
										category_container.place_after( click_wrapper, article_container );
									}
									pulsating_wrapper.stop_pulsating();
								}, self._not_reached );
							}
						} ) );
						dom_tools.set_jss( click_wrapper.domNode, {
							cursor: 'pointer',
							'-webkit-tap-highlight-color': 'transparent'
						} );
					}, self._not_reached );

				} );
				category_container.set_widgets(click_wrappers);

				self.__expand_selection();
				
			}, function(error) {
				self._log_warn( 'categories error', error );
			} );

			return self.inherited(arguments);
		}
		
	} );
	
} );
