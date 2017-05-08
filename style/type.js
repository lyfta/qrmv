// (c) 2017 Tom Engström for Lyfta
define( [
	'qrmv/style/color',
	'quantum/class-loader'
], function(
	color,
	class_loader
) {
	
	// Load the Montserrat font (client side only) (tsp.ac/392444162)
	if ( typeof(window) != 'undefined' ) {
		class_loader.require('horizon/browser/css-loader').then( function(css_loader) {
			css_loader.load_string(
				"@import url('https://fonts.googleapis.com/css?family=Montserrat');",
				'qrmv/style/type'
			);
		}, function(error) {
			// ignore
		} );
	}

	var type =  {

		general: {
			'font-family': 		'Montserrat, sans-serif',
		},
		
		article_title: {
			'font-size':		'24px',
			'line-height':		'1.2em',
			'font-weight':		'700',
			'color':			color.red,
		},
		
		article_meta_field_name: {
			'line-height':		'1.2em',
			'font-weight':		'700',
			'color':			color.red,
			'display':			'inline-block'
		},
		article_meta_field_value: {
			'line-height':		'1.2em',
			'font-weight':		'400',
			'display':			'inline-block',
			'margin-left':		'5px'
		},

		paragraph: {
			'line-height': 		'1.3em',
			'font-weight':		'400'
		},
		
		heading: {
			'font-size': 		'24px',
			'line-height': 		'1em',
			'letter-spacing': 	'3px',
			'font-weight': 		'700',
			'text-transform': 	'uppercase',
			
			'background-color':	color.red,
			'color': 			color.black,
			
			'padding':			'1px 5px 0px 5px',
			'display': 			'inline-block'
		},
		subheading: {
			'font-size': 		'22px',
			'line-height': 		'1em',
			'letter-spacing': 	'2px',
			
			'font-weight': 		'700',
			'color': 			color.red,
		},
		
		article_name: {
			color: 				color.red,
			'line-height': 		'1.5em',
			'text-decoration': 	'underline'
		},
		category_name: {
			color: 			color.red,
			'line-height': 	'1.5em',
			'font-weight':	'700'
		},
		
		field_name: {
			color: color.red,
			'font-weight': '700'
		}
	};
	
	return type;
} );
	