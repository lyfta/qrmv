/**
 * Static class with helpers for QRMv
 */
define( [
	'materia/standard-tags'
], function(
	standard_tags
) {
		var constants = {
		};
		
		constants.RECORD_TYPE_ID = standard_tags.RECORD_TYPE.get_numid();
		constants.BLOG_ENTRY_TYPE_ID = 404099;
		constants.RESOURCE_OBJECT_ID = 490592781;
		
		constants.get_point_on_circle = function( x1, y1, x2, y2, r ) {
			var angle = Math.atan2( x2 - x1, y2 - y1 );
			angle = constants.normalize_angle(angle);
			
			return {
				x: x1 + r * Math.cos(angle),
				y: y1 + r * Math.sin(angle)
			};
		};
		
		constants.get_distance = function( x1, y1, x2, y2 ) {
			return Math.sqrt( Math.pow( x1 - x2, 2 ) + Math.pow( y1 - y2, 2) );
		};
		
		/** Normalize an angle to a full 0-2*PI value
		 */
		constants.normalize_angle = function(angle) {
			var n = angle < 0 ? angle * -1 : ( 2 * Math.PI - angle );
			n += Math.PI / 2;
			return n;
		};
		
		/**
		 * Draw a pie sector to the supplied snap object. 
		 */
		constants.draw_pie_sector = function(snap, centre, rIn, rOut, startDeg, delta, attr) {
			var startOut = {
				x: centre.x + rOut * Math.cos(Math.PI*(startDeg)/180),
				y: centre.y + rOut * Math.sin(Math.PI*(startDeg)/180)
			};
			var endOut = {
				x: centre.x + rOut * Math.cos(Math.PI*(startDeg + delta)/180),
				y: centre.y + rOut * Math.sin(Math.PI*(startDeg + delta)/180)
			};
			var startIn = {
				x: centre.x + rIn * Math.cos(Math.PI*(startDeg + delta)/180),
				y: centre.y + rIn * Math.sin(Math.PI*(startDeg + delta)/180)
		   };
		   var endIn = {
				x: centre.x + rIn * Math.cos(Math.PI*(startDeg)/180),
				y: centre.y + rIn * Math.sin(Math.PI*(startDeg)/180)
		   };
		   
		   var largeArc = delta > 180 ? 1 : 0;
		   
		   var path = "M" + startOut.x + "," + startOut.y +
		           " A" + rOut + "," + rOut + " 0 " +
		           largeArc + ",1 " + endOut.x + "," + endOut.y +
		           " L" + startIn.x + "," + startIn.y +
		           " A" + rIn + "," + rIn + " 0 " +
		           largeArc + ",0 " + endIn.x + "," + endIn.y +
		           " L" + startOut.x + "," + startOut.y + " Z";
		   var path = snap.path(path);
		   path.attr(attr);
		   return path;
		};
		
		var string_ends_with = function(str, substr) {
			var substring = str.substr( str.length - substr.length );
			return substring == substr;
		};
		
		constants.trim_px = function(str) {
			var trimmed = str;
			if ( string_ends_with(str, 'px') ) {
				trimmed = parseFloat( str.substr( 0, str.length - 2 ) );
			};
			return trimmed;
		};
		
		var jss_to_style_args = function(jss, trim_px) {
			var style_args = {};
			
			for ( var key in jss ) {
				var parts = key.split('-');
				
				var value = jss[key];
				var style_value = value;
				
				if (trim_px) {
					// Strip px from end
					style_value = constants.trim_px(style_value);
				}
				
				var style_key = parts.join('_');
				style_args[style_key] = style_value;
			}
			return style_args;
		};
		
		constants.jss_to_box_style_args = function(jss) {
			return jss_to_style_args(jss, true);
		};
		
		constants.jss_to_text_style_args = function(jss) {
			return jss_to_style_args(jss, false);
		};
		
		return constants;
	}
);

