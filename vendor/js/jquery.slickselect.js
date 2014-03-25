/*!
 * slickSelect - jQuery Plugin
 * version: 1.0 (10 Sep 2013)
 *
 * Copyright (c) 2013 Matt and Michael Golus
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

;(function ($, window, document, undefined){

	var pluginName = "slickselect",
		defaults = {
		wrapClass: "ss-wrapper"
	};

	function Plugin (element, options){
		this.element = element;
		this.settings = $.extend({}, defaults, options);
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype = {
		init: function(){
			var plugin = this,
				element = $(this.element);
			plugin.selectText = $('<span/>');
			element.css({
					position: 'absolute',
					left: 0,
					top: 0,
					width: '100%',
					height: '100%',
					opacity: 0,
					'-webkit-appearance': 'menulist-button'
				})
				.wrap('<div class="' + plugin.settings.wrapClass + '" style="position:relative"/>')
				.focus(function(){element.parent().addClass('focus')})
				.blur(function(){element.parent().removeClass('focus')})
				.change(function(){plugin.changeSelectText()});
			plugin.selectText.insertBefore(element);
			plugin.changeSelectText();
		},
		changeSelectText: function(){
			this.selectText.text($(this.element).children('option:selected').text())
		}
	};

	$.fn[pluginName] = function(options){
		return this.each(function() {
			if (!$.data(this, "plugin_" + pluginName)){
				$.data(this, "plugin_" + pluginName,new Plugin(this, options));
			}
		});
	};

})(jQuery, window, document);