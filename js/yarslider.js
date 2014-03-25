/*
 * Yet AnotheR Slider v0.4.1
 * Author: Tory Martin
 * Licensed under the MIT license
 */

// Note that with this pattern, as per Alex Sexton's, the plugin logic
// hasn't been nested in a jQuery plugin. Instead, we just use
// jQuery for its instantiation.

;(function( $, window, document, undefined ){

	'use strict';
	var pluginName = "yarslider";
	var version = '0.4.1';

    /* ------------------------------
	 * |          Utilities         |
	 * ------------------------------ */

	/* CSS transition support detection */
    var cssTransitionSupport = (function(){

        var body = document.body || document.documentElement,
            // transition events with names
            transEndEvents = {
                'transition'      : 'transitionend',
                'WebkitTransition': 'webkitTransitionEnd',
                'MozTransition'   : 'transitionend',
                'MsTransition'    : 'MSTransitionEnd',
                'OTransition'     : 'oTransitionEnd otransitionend'
            }, name;

        // check for each transition type
        for (name in transEndEvents){

            // if transition type is supported
            if (body.style[name] !== undefined) {

                // return transition end event name
                return transEndEvents[name];
            }
        }

        // css transitions are not supported
        return false;
    })();

	var noop = function() {}; // simple no operation function
    var offloadFn = function(fn) { setTimeout(fn || noop, 0); }; // offload a functions execution

		/* browser feature detection */
    var browser = {
		addEventListener: !!window.addEventListener,
		touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
		transitions: (function(temp) {
			var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
			for ( var i in props ) if (temp.style[ props[i] ] !== undefined) return true;
			return false;
		})(document.createElement('swipe'))
	};

	/* ----------------------------
	 * |	Global Variables      |
	 * |	made local later      |
	 * ---------------------------- */
	var vars = {
		width:				0,
		height:				0,
		startSlide:			0,
		activeSlide:		0,
		totalSlides:		0,
		pagerTotal:			0,
		auto:				0,
		$slides:			null,
		slidePos:			null,
		elem:				null,
		container:			null,
		$container:			null,
		containerSelector:	null,
		slideSelector:		null,
		controlSelector:	null,
		durationManual:		500,
		durationAuto:		2000,
		transitionType:		'fade',
		continuous:			true,
		disableScroll:		false,
		stopPropogation:	false,
		sliding:			false,
		debug:				1,
		touches:			null,
		delta:				null,
		isScrolling:		null,
		start:				null,
		touched:			0
	};

	var defaults = {
		startSlide:			0,
		durationManual:		500,
		durationAuto:		200,
		continuous:			true,
		disableScroll:		false,
		stopPropogation:	false,
		auto:				1000,
		slideSelector:		'.yar-slide',
		controlsSelector:	'.yar-slider-controls',
		slideChange:		function () {},
		transitionEnd:		function () {},
		initFinished:		function () {}
	};

	/* ------------------------------
	 * |     Plugin constructor     |
	 * ------------------------------ */
	var YarSlider = function( element, input_options ){
		// User supplied options
		var options = input_options;

		// Cache Elements for later use
		this.elem = element;
		this.$elem = $(this.elem);

		/* This next line takes advantage of HTML5 data attributes
		 * to support customization of the plugin on a per-element
		 * basis. For example,
		 * <div class=item' data-plugin-options='{"message":"Goodbye World!"}'></div> */
		var metadata = this.$elem.data( "slider-options" );

		/* Create new Local Variables with
		 * vars, defaults, options, and metadata */
		this.vars = $.extend( {}, vars, defaults, options, metadata );

		/* Save some variables for this plugin instance */
		this.vars.elem = this.elem;
		this.vars.$elem = this.$elem;

		// Convention (so I'm told)
		this._name = pluginName;
		this.that = this;

		// For Auto Slideshow
		this.interval = null;

		// Init that plugin!
		this.init();
	};

	/* ------------------------------
	 * |      Plugin prototype      |
	 * ------------------------------ */

	var pm = YarSlider.prototype = {
		/* ------------------------------
		 * |       Event Capturing      |
		 * ------------------------------ */

		events: {
			handleEvent: function(event) {

				switch (event.type) {
					case 'touchstart': this.start(event); break;
					case 'touchmove': this.move(event); break;
					case 'touchend': offloadFn(this.end(event)); break;
					case 'webkitTransitionEnd':
					case 'msTransitionEnd':
					case 'oTransitionEnd':
					case 'otransitionend':
					case 'transitionend': offloadFn(this.transitionEnd(event)); break;
					case 'resize': offloadFn(onResize.call()); break;
				}

				// if (this.vars.stopPropagation) event.stopPropagation();
			},
			start: function(event) {
				console.log(this);
				this.vars.touches = event.touches[0];
				this.vars.touched += 1;

				$(this.vars.container).removeClass('no-touch');
				this.vars.$slides.eq(this.vars.activeSlide).removeClass("transition-speed");
				// measure start values
				this.vars.start = {
					// get initial touch coords
					x: this.vars.touches.pageX,
					y: this.vars.touches.pageY,

					// store time to determine touch duration
					time: +new Date
				};

				// used for testing first move event
				this.vars.isScrolling = undefined;

				// reset delta and end measurements
				this.vars.delta = {};

				var pos = this.vars.totalSlides;

				if (this.vars.touched == 1) {
					while(pos--) {
						var slide = this.vars.$slides[pos];

						slide.style.width = this.vars.width + 'px';
						slide.setAttribute('data-index', pos);

						this.vars.$slides.eq(pos).removeClass("transition-speed");

						if (browser.transitions) {
							slide.style.opacity = 1;

							if ( pos == this.vars.totalSlides - 1 && this.vars.activeSlide === 0 ) {
								this.vars.slidePos[pos] = -((this.vars.activeSlide + 1) * this.vars.width);
								if (this.vars.touched == 1)
									translate(pos, -((this.vars.activeSlide + 1) * this.vars.width), 0);
							} else if ( pos === 0 && this.vars.activeSlide == this.vars.totalSlides - 1 ) {
								this.vars.slidePos[pos] = this.vars.width;
								if (this.vars.touched == 1)
									translate(pos, this.vars.width, 0);
							} else {
								this.vars.slidePos[pos] = ((pos * this.vars.width) - (this.vars.activeSlide * this.vars.width));
								if (this.vars.touched == 1)
									translate(pos, ((pos * this.vars.width) - (this.vars.activeSlide * this.vars.width)), 0);
							}
						}
					}
				}

				// attach touchmove and touchend listeners
				this.elem.addEventListener('touchmove', this, false);
				this.elem.addEventListener('touchend', this, false);
			},
			move: function(event) {
				// ensure swiping with one touch and not pinching
				if ( event.touches.length > 1 || event.scale && event.scale !== 1) return;

				if (this.vars.disableScroll) event.preventDefault();

				this.vars.touches = event.touches[0];

				// measure change in x and y
				this.vars.delta = {
					x: this.vars.touches.pageX - this.vars.start.x,
					y: this.vars.touches.pageY - this.vars.start.y
				};

				// determine if scrolling test has run - one time test
				if ( typeof isScrolling == 'undefined') {
					this.vars.isScrolling = !!( this.vars.isScrolling || Math.abs(this.vars.delta.x) < Math.abs(this.vars.delta.y) );
				}

				// if user is not trying to scroll vertically
				if (!this.vars.isScrolling) {

					// prevent native scrolling
					event.preventDefault();

					// stop slideshow
					stop();

					// increase resistance if first or last slide
					if (this.vars.continuous) { // we don't add resistance at the end

						translate(circle(this.vars.activeSlide-1), this.vars.delta.x + this.vars.slidePos[circle(this.vars.activeSlide-1)], 0);
						translate(this.vars.activeSlide, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide], 0);
						translate(circle(this.vars.activeSlide+1), this.vars.delta.x + this.vars.slidePos[circle(this.vars.activeSlide+1)], 0);

					} else {

						this.vars.delta.x =
							this.vars.delta.x /
							( (!this.vars.activeSlide && this.vars.delta.x > 0               	// if first slide and sliding left
								|| this.vars.activeSlide == this.vars.$slides.length - 1      // or if last slide and sliding right
	 								&& this.vars.delta.x < 0                    	// and if sliding at all
						) ?
							( Math.abs(this.vars.delta.x) / this.vars.width + 1 )     // determine resistance level
							: 1 );											// no resistance if false

						// translate 1:1
						translate(this.vars.activeSlide-1, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide-1], 0);
						translate(this.vars.activeSlide, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide], 0);
						translate(this.vars.activeSlide+1, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide+1], 0);
					}

				}
			},
			end: function(event) {
				// measure duration
				var duration = new Date().getTime() - this.vars.start.time;

				// determine if slide attempt triggers next/prev slide
				//	// if slide duration is less than 250ms
				//	// and if slide amt is greater than 20px
				//	// or if slide amt is greater than half the width
				var isValidSlide =
					Number(duration) < 250 && Math.abs(this.vars.delta.x) > 20 || Math.abs(this.vars.delta.x) > this.vars.width/2;

				// determine if slide attempt is past start and end
				var isPastBounds =
					!this.vars.activeSlide && this.vars.delta.x > 0 || this.vars.activeSlide == this.vars.$slides.length - 1 && this.vars.delta.x < 0;

				if (this.vars.continuous) isPastBounds = false;

				// determine direction of swipe (true:right, false:left)
				var direction = this.vars.delta.x < 0;

				// determine speed to finish slide
				var finishSpeed = ( Number(duration) / ( Math.abs(this.vars.delta.x) / this.vars.width ) );
				if (finishSpeed > 1000)
					finishSpeed = 1000;

				// if not scrolling vertically
				if (!this.vars.isScrolling) {

					if (isValidSlide && !isPastBounds) {

						var from = this.vars.activeSlide;

						if (direction) {
							if (this.vars.continuous) { // we need to get the next in this direction in place
								move(circle(this.vars.activeSlide-1), -this.vars.width, 0);
								move(circle(this.vars.activeSlide+2), this.vars.width, 0);
							} else {
								move(this.vars.activeSlide-1, -this.vars.width, 0);
							}

							move(this.vars.activeSlide, this.vars.slidePos[this.vars.activeSlide]-this.vars.width, finishSpeed);
							move(circle(this.vars.activeSlide+1), this.vars.slidePos[circle(this.vars.activeSlide+1)]-this.vars.width, finishSpeed);
							this.vars.activeSlide = circle(this.vars.activeSlide+1);
						} else {
							if (this.vars.continuous) { // we need to get the next in this direction in place
								move(circle(this.vars.activeSlide+1), this.vars.width, 0);
								move(circle(this.vars.activeSlide-2), -this.vars.width, 0);
							} else {
								move(this.vars.activeSlide+1, this.vars.width, 0);
							}

							move(this.vars.activeSlide, this.vars.slidePos[this.vars.activeSlide]+this.vars.width, finishSpeed);
							move(circle(this.vars.activeSlide-1), this.vars.slidePos[circle(this.vars.activeSlide-1)]+this.vars.width, finishSpeed);
							this.vars.activeSlide = circle(this.vars.activeSlide-1);
						}


						// this.vars.callback && this.vars.callback(this.vars.activeSlide, slides[this.vars.activeSlide]);

						this.vars.$slides.eq(this.vars.activeSlide).addClass("active");
						this.vars.$slides.eq(from).removeClass("active");

					} else {

						if (this.vars.continuous) {
							move(circle(this.vars.activeSlide-1), -this.vars.width, finishSpeed);
							move(this.vars.activeSlide, 0, finishSpeed);
							move(circle(this.vars.activeSlide+1), this.vars.width, finishSpeed);
						} else {
							move(this.vars.activeSlide-1, -this.vars.width, finishSpeed);
							move(this.vars.activeSlide, 0, finishSpeed);
							move(this.vars.activeSlide+1, this.vars.width, finishSpeed);
						}
					}
				}

				// kill touchmove and touchend event listeners until touchstart called again
				this.elem.removeEventListener('touchmove', events, false);
				this.elem.removeEventListener('touchend', events, false);
			},
			transitionEnd: function(event) {
			}
		},

		/* -----------------------------------
		 * |		Public functions         |
		 * ----------------------------------- */

		/* Plugin init here */
		init: function() {
			// Introduce defaults that can be extended either
			// globally or using an object literal.
			//
			// Set up container
			this.vars.container = this.$elem;
			this.vars.containerSelector = "."  + this.vars.container.attr('class');
			this.vars.container.addClass('no-touch');

			// Set up slides
			this.vars.$slides = this.vars.container.children();
			this.vars.totalSlides = this.vars.$slides.length;
			this.vars.pagerTotal = this.vars.totalSlides;

			this.vars.slidePos = new Array(this.vars.totalSlides);

			if (this.vars.totalSlides == 1) {
				var imageSelector = this.vars.containerSelector + ".no-touch " + this.vars.slideSelector + " .image";
				var captionSelector = this.vars.containerSelector + ".no-touch " + this.vars.slideSelector + " .caption";
				$(imageSelector).css('opacity', 1);
				$(captionSelector).css('opacity', 1);
				this.vars.container.css({'opacity': 1});

				$(this.vars.slideSelector).css('opacity', 0);
				return false;
			}

			if (browser.transitions && this.vars.totalSlides < 3) {
				this.vars.$slides[0].parentNode.appendChild(this.vars.$slides[0].cloneNode(true));
				this.vars.$slides[0].parentNode.insertBefore(this.vars.$slides[1].cloneNode(true), this.vars.$slides[0].parentNode.firstChild);
				this.vars.$slides = this.vars.container.children();
				this.vars.totalSlides = 4;
			}

			/* Set some important variables */
			this.onResize();

			/* Set startSlide */
			if (this.vars.startSlide > 0) {
				if(this.vars.startSlide >= this.vars.totalSlides) {
					this.vars.startSlide = this.vars.totalSlides - 1;
				}
				this.vars.activeSlide = this.vars.startSlide;

			} else {
				this.vars.activeSlide = 0;
			}

			this.vars.$slides.eq(this.vars.activeSlide).addClass('active transition-speed');

            /* Add Pagination List elements */

			var pagerList = this.vars.container.next().children('.pager-list');

            for (var i = 0; i < this.vars.pagerTotal; i++)
			{
				pagerList.append('<li data-index="' + i + '">' + (i+1) + '</li>');
			}

			var that = this;

			// Add event listeners for pager
			this.vars.container.next().children('.pager').click(function(){
				that.vars.container.addClass('no-touch');
				if ($(this).hasClass('prev'))
					that.prev();
				else
					that.next();
			});

			this.vars.container.next().children('.pager-list').children('li').click(function(){
				that.vars.container.addClass('no-touch');
				var pos = that.vars.totalSlides;

				that.toSlide($(this).index(), 'fade', that.vars.durationAuto);
			});

			/* add event listeners */
			if (browser.addEventListener) {

				// set touchstart event on element
				if (browser.touch) this.elem.addEventListener('touchstart', this.events, false);

				if (browser.transitions) {
					console.log('adding event listeners');
					this.elem.addEventListener('webkitTransitionEnd', this.events, false);
					this.elem.addEventListener('msTransitionEnd', this.events, false);
					this.elem.addEventListener('oTransitionEnd', this.events, false);
					this.elem.addEventListener('otransitionend', this.events, false);
					this.elem.addEventListener('transitionend', this.events, false);
				}
					// set resize event on window
					window.addEventListener('resize', this.events, false);
			}

			this.changeSlides(this.vars.activeSlide, 'fade', this.vars.durationAuto);

			// show main container after initializing (no jumping in)
			this.vars.container.css({'opacity': 1});

			// initFinished Callback
			if (this.vars.initFinished && typeof(this.vars.initFinished) === "function") {
				this.vars.initFinished();
			}

			return this;
		},

		/* Show previous slide */
		prev: function() {
			this.changeSlides(this.vars.activeSlide - 1, this.vars.transitionType, this.vars.durationAuto);
        },

        /* Show next slide */
        next: function() {
			this.changeSlides(this.vars.activeSlide + 1, this.vars.transitionType, this.vars.durationAuto);
        },

        /* Set current to index (type: slide/fade - duration: speed in milliseconds) */
        toSlide: function(index, type, duration) {
			this.changeSlides(index, type, duration);
        },

        /* Return current slide index (start at 0) */
        getPos: function() {
			return this.vars.activeSlide;
        },

        /* Return number of slides in slideshow */
        getNumSlides: function() {
			return this.vars.totalSlides;
        },

		/* Clean up slider */
        destroy: function () {
            // unset Plugin data instance
            this.element.data( dataPlugin, null );
        },

        /* ----------------------------------
		 * |      Private-ish functions		|
		 * ---------------------------------- */

        /* Called on window resize
		resets variables regarding width/height of elements */
		onResize: function() {
			this.vars.width = this.vars.container.outerWidth();
			this.vars.height = this.vars.container.outerHeight();
		},

		/* -- Non-touch slide changes -- */
		changeSlides: function(to, type, speed) {

			if (this.vars.activeSlide === to) return;

			if (this.vars.activeSlide < to && to == this.vars.totalSlides)
				to = 0;

			if (this.vars.activeSlide > to && to < 0)
				to = this.vars.totalSlides - 1;

			var pos = this.vars.totalSlides;

			while (pos--) {
				this.vars.$slides.eq(pos).css({
					'opacity'	:	'',
					'-webkit-transition'	:	'',
					'transition'			:	'',
					'width'					:	'',
					'-webkit-transform'		:	'',
					'transform'				:	''
				});
			}

			if (!this.vars.touched) {
				this.vars.$slides.eq(to).addClass("active transition-speed");
				this.vars.$slides.eq(this.vars.activeSlide).removeClass("active");

				this.vars.activeSlide = to;
			} else {
				setTimeout( function(){
					this.vars.$slides.eq(to).addClass("transition-speed");
					this.vars.$slides.eq(this.vars.activeSlide).addClass("transition-speed");

					setTimeout( function(){
						this.vars.$slides.eq(to).addClass("active");
						this.vars.$slides.eq(this.vars.activeSlide).removeClass("active");

						this.vars.activeSlide = to;
						this.vars.touched = 0;
					}, 1);

				}, 1);
			}
		},

		/* -- a simple positive modulo using slides.length (from swipe.js) -- */
		circle: function(index) {
			return (this.vars.$slides.length + (index % this.vars.$slides.length)) % this.vars.$slides.length;
		},

		/* Add support for older browsers */
		animate: function(from, to, type, speed) { /* TODO (maybe.. I mean, who really cares about IE8) */ },

		/* Move slide */
		move: function(index, dist, speed) {
			translate(index, dist, speed);
			this.vars.slidePos[index] = dist;
		},

		/* Actually translate slide */
		translate: function(index, dist, speed) {
			var slide = this.vars.$slides[index];
			var style = slide && slide.style;

			var slidePrev = this.vars.$slides[index + 1];
			var stylePrev = slidePrev && slidePrev.style;

			if (!style) return;

			style.webkitTransitionDuration =
			style.MozTransitionDuration =
			style.msTransitionDuration =
			style.OTransitionDuration =
			style.transitionDuration = speed + 'ms';

			style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
			style.msTransform =
			style.MozTransform =
			style.OTransform = 'translateX(' + dist + 'px)';
		},

		/* setup automatic slideshow */
		begin: function() {
			console.log('begin timer');
			this.interval = setTimeout(this.next(), this.vars.auto);

		},

		stop: function() {
			delay = 0;
			clearTimeout(this.interval);
		}
	};

	/* ------------------------------
	 * |		Misc init			|
	 * ------------------------------ */

	/* Encapsulate defaults into prototype */
	YarSlider.defaults = YarSlider.prototype.defaults;
	window.YarSlider = YarSlider;

	$.fn[ pluginName ] = function ( options ) {
		return this.each(function() {
			if ( !$.data( this, "plugin_" + pluginName ) ) {
				$.data( this, "plugin_" + pluginName, new YarSlider( this, options ) );
			}
		});
	};

})( jQuery, window , document );