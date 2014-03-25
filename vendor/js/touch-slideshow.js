/*
 *  Project: 		Slider
 *  Description:	Slider
 *  Author:			Michael Golus & Tory Martin
 *  License:		2013
 */
 

// semicolon before to prevent unclosed previous code
;(function ( $, window, undefined ) {

	var pluginName = "slider",
    // the name of using in .data()
        dataPlugin = "plugin_" + pluginName,
    // default options
        defaults = {
            color: "black",
            
        };

    var privateMethod = function () {
        console.log("private method");
    };

    // The actual plugin constructor
    var Plugin = function ( element ) {
        /*
         * Plugin instantiation
         */
        this.options = $.extend( {}, defaults );
        
    };

    Plugin.prototype = {

        init: function ( options ) {

            // extend options ( http://api.jquery.com/jQuery.extend/ )
            $.extend( this.options, options );

            /*
             * Place initialization logic here
             */
            this.element.css( 'color', 'red' );
        },
        
        previousSlide: function() {
	        
        },
        
        nextSlide: function() {
	        
        },
        
        changeSlide: function(to, type, speed) {
	        
        },
        
        getCurrentSlide: function() {
	        
        },

        destroy: function () {
            // unset Plugin data instance
            this.element.data( dataPlugin, null );
        }


    }
    
    /*
     * Plugin wrapper, preventing against multiple instantiations and
     * allowing any public function to be called via the jQuery plugin,
     * e.g. $(element).pluginName('functionName', arg1, arg2, ...)
     */
	$.fn.slider = function( arg ) {
  		var args, instance;

        // only allow the plugin to be instantiated once
        if (!( this.data( dataPlugin ) instanceof Plugin )) {

            // if no instance, create one
            this.data( dataPlugin, new Plugin( this ) );
        }

        instance = this.data( dataPlugin );

        instance.element = this;

        // Is the first parameter an object (arg), or was omitted,
        // call Plugin.init( arg )
        if (typeof arg === 'undefined' || typeof arg === 'object') {

            if ( typeof instance['init'] === 'function' ) {
                instance.init( arg );
            }

        // checks that the requested public method exists
        } else if ( typeof arg === 'string' && typeof instance[arg] === 'function' ) {

            // copy arguments & remove function name
            args = Array.prototype.slice.call( arguments, 1 );

            // call the method
            return instance[arg].apply( instance, args );

        } else {

            $.error('Method ' + arg + ' does not exist on jQuery.' + pluginName);

        }   
	};
	
}(jQuery, window));