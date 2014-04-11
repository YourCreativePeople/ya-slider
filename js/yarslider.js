/*
 * Yet AnotheR Slider v1.0
 * Author: Tory Martin
 * Licensed under the MIT license
 */

// Note that with this pattern, as per Alex Sexton's, the plugin logic
// hasn't been nested in a jQuery plugin. Instead, we just use
// jQuery for its instantiation.

;(function( $, window, document, undefined ){

    'use strict';
    var pluginName = "yarslider";
    var version = '1.0.0';

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

    /* Browser feature detection */
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
     * |    Global Variables      |
     * |    made local later      |
     * ---------------------------- */
    var vars = {
        width:              0,
        height:             0,
        activeSlide:        0,
        totalSlides:        0,
        pagerTotal:         0,
        $slides:            null,
        slidePos:           null,
        elem:               null,
        container:          null,
        $container:         null,
        containerSelector:  null,
        slideSelector:      null,
        controlSelector:    null,
        durationManual:     500,
        durationAuto:       2000,
        transitionType:     'fade', /* TODO: make other types of transitions */
        touches:            null,
        delta:              null,
        isScrolling:        null,
        start:              null,
        touched:            0
    };

    /* ---------------------------
     * |    Plugin Defaults      |
     * --------------------------- */
    var defaults = {
        startSlide:         0,		/* Start slide (starts at 0);
        durationManual:     500,	/* Duration for manual slide change (fade) */
        durationAuto:       200,	/* Duration for automatic slide change (fade) */
        continuous:         true,	/* Wrap slideshow around ends */
        disableScroll:      false,	/* Allow/disallow scrolling while sliding */
        stopPropogation:    false,	/* Stop event propogation */
        auto:               0,		/* Automatic slideshow timer (in ms) */
        slideSelector:      '.yar-slide',				/* Slide selector class */
        controlsSelector:   '.yar-slider-controls',		/* Slide controls class */
        slideChange:        function () {},		/* Callback on slide change */
        transitionEnd:      function () {},		/* Callback on transition end */
        initFinished:       function () {}		/* Callback after init */
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
        /* -----------------------------------
         * |        Public functions         |
         * ----------------------------------- */

        /* Plugin init here */
        init: function() {
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

                this.vars.$elem.next().remove(); // Remove controls div if only one slide

                return false;
            }

            /* If only 2 slides exist
                Duplicate each one */
            if (browser.transitions && this.vars.totalSlides < 3) {
                this.vars.$slides[0].parentNode.appendChild(this.vars.$slides[0].cloneNode(true));
                this.vars.$slides[0].parentNode.insertBefore(this.vars.$slides[1].cloneNode(true), this.vars.$slides[0].parentNode.firstChild);
                this.vars.$slides = this.vars.container.children();
                this.vars.totalSlides = 4;
            }

            /* Set some important variables */
            this.onResize();

            /* Set start slide & active slide */
            this.vars.activeSlide = 0;

            if (this.vars.startSlide > 0) {
                if(this.vars.startSlide >= this.vars.totalSlides)
                    this.vars.startSlide = this.vars.totalSlides - 1;
                this.vars.activeSlide = this.vars.startSlide;
            }

            this.vars.$slides.eq(this.vars.activeSlide).addClass('active transition-speed');

            /* Add Pagination List elements */
            var pagerList = this.vars.container.next().children('.pager-list');
            for (var i = 0; i < this.vars.pagerTotal; i++)
                pagerList.append('<li data-index="' + i + '">' + (i+1) + '</li>');

            var that = this; /* temporary storage of this */


            /* Event Listeners */

            /* Add event listeners for pager */
            this.vars.container.next().children('.pager').click(function() {
                that.vars.container.addClass('no-touch');
                if ($(this).hasClass('prev'))
                    that.prev();
                else
                    that.next();
            });

            this.vars.container.next().children('.pager-list').children('li').click(function() {
                that.vars.container.addClass('no-touch');
                var pos = that.vars.totalSlides;

                that.toSlide($(this).index(), 'fade', that.vars.durationAuto);
            });

            /* Add touch event listeners */
            if (browser.addEventListener) {

                // set touchstart event on element
                if (browser.touch) this.elem.addEventListener('touchstart', this, false);

                if (browser.transitions) {
                    this.elem.addEventListener('webkitTransitionEnd', this, false);
                    this.elem.addEventListener('msTransitionEnd', this, false);
                    this.elem.addEventListener('oTransitionEnd', this, false);
                    this.elem.addEventListener('otransitionend', this, false);
                    this.elem.addEventListener('transitionend', this, false);
                }

                // set resize event on window
                window.addEventListener('resize', this, false);
            }

            /* Change to active slide */
            this.changeSlides(this.vars.activeSlide, 'fade', this.vars.durationAuto);

            /* show main container after initializing (no jumping in) */
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

        /* ------------------------------
         * |       Event Capturing      |
         * ------------------------------ */

        handleEvent: function(event) {

            switch (event.type) {
                case 'touchstart': this.touchStart(event); break;
                case 'touchmove': this.touchMove(event); break;
                case 'touchend': offloadFn(this.touchEnd(event)); break;
                case 'webkitTransitionEnd':
                case 'msTransitionEnd':
                case 'oTransitionEnd':
                case 'otransitionend':
                case 'transitionend': offloadFn(this.transitionEnd(event)); break;
                case 'resize': offloadFn(this.onResize()); break;
            }

            if (this.vars.stopPropagation) event.stopPropagation();
        },
        touchStart: function(event) {
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
                                this.translate(pos, -((this.vars.activeSlide + 1) * this.vars.width), 0);
                        } else if ( pos === 0 && this.vars.activeSlide == this.vars.totalSlides - 1 ) {
                            this.vars.slidePos[pos] = this.vars.width;
                            if (this.vars.touched == 1)
                                this.translate(pos, this.vars.width, 0);
                        } else {
                            this.vars.slidePos[pos] = ((pos * this.vars.width) - (this.vars.activeSlide * this.vars.width));
                            if (this.vars.touched == 1)
                                this.translate(pos, ((pos * this.vars.width) - (this.vars.activeSlide * this.vars.width)), 0);
                        }
                    }
                }
            }

            // attach touchmove and touchend listeners
            this.elem.addEventListener('touchmove', this, false);
            this.elem.addEventListener('touchend', this, false);
        },
        touchMove: function(event) {
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

                    this.translate(this.circle(this.vars.activeSlide-1), this.vars.delta.x + this.vars.slidePos[this.circle(this.vars.activeSlide-1)], 0);
                    this.translate(this.vars.activeSlide, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide], 0);
                    this.translate(this.circle(this.vars.activeSlide+1), this.vars.delta.x + this.vars.slidePos[this.circle(this.vars.activeSlide+1)], 0);

                } else {

                    this.vars.delta.x =
                        this.vars.delta.x /
                        ( (!this.vars.activeSlide && this.vars.delta.x > 0              // if first slide and sliding left
                            || this.vars.activeSlide == this.vars.$slides.length - 1    // or if last slide and sliding right
                                && this.vars.delta.x < 0                        		// and if sliding at all
                    ) ?
                        ( Math.abs(this.vars.delta.x) / this.vars.width + 1 )   // determine resistance level
                        : 1 );                                          		// no resistance if false

                    // translate 1:1
                    this.translate(this.vars.activeSlide-1, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide-1], 0);
                    this.translate(this.vars.activeSlide, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide], 0);
                    this.translate(this.vars.activeSlide+1, this.vars.delta.x + this.vars.slidePos[this.vars.activeSlide+1], 0);
                }

            }
        },
        touchEnd: function(event) {
            // measure duration
            var duration = new Date().getTime() - this.vars.start.time;

            // determine if slide attempt triggers next/prev slide
            //  // if slide duration is less than 250ms
            //  // and if slide amt is greater than 20px
            //  // or if slide amt is greater than half the width
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
                            this.move(this.circle(this.vars.activeSlide-1), -this.vars.width, 0);
                            this.move(this.circle(this.vars.activeSlide+2), this.vars.width, 0);
                        } else {
                            this.move(this.vars.activeSlide-1, -this.vars.width, 0);
                        }

                        this.move(this.vars.activeSlide, this.vars.slidePos[this.vars.activeSlide]-this.vars.width, finishSpeed);
                        this.move(this.circle(this.vars.activeSlide+1), this.vars.slidePos[this.circle(this.vars.activeSlide+1)]-this.vars.width, finishSpeed);
                        this.vars.activeSlide = this.circle(this.vars.activeSlide+1);
                    } else {
                        if (this.vars.continuous) { // we need to get the next in this direction in place
                            this.move(this.circle(this.vars.activeSlide+1), this.vars.width, 0);
                            this.move(this.circle(this.vars.activeSlide-2), -this.vars.width, 0);
                        } else {
                            this.move(this.vars.activeSlide+1, this.vars.width, 0);
                        }

                        this.move(this.vars.activeSlide, this.vars.slidePos[this.vars.activeSlide]+this.vars.width, finishSpeed);
                        this.move(this.circle(this.vars.activeSlide-1), this.vars.slidePos[this.circle(this.vars.activeSlide-1)]+this.vars.width, finishSpeed);
                        this.vars.activeSlide = this.circle(this.vars.activeSlide-1);
                    }


                    // this.vars.callback && this.vars.callback(this.vars.activeSlide, slides[this.vars.activeSlide]);

                    this.vars.$slides.eq(this.vars.activeSlide).addClass("active");
                    this.vars.$slides.eq(from).removeClass("active");

                } else {

                    if (this.vars.continuous) {
                        this.move(this.circle(this.vars.activeSlide-1), -this.vars.width, finishSpeed);
                        this.move(this.vars.activeSlide, 0, finishSpeed);
                        this.move(this.circle(this.vars.activeSlide+1), this.vars.width, finishSpeed);
                    } else {
                        this.move(this.vars.activeSlide-1, -this.vars.width, finishSpeed);
                        this.move(this.vars.activeSlide, 0, finishSpeed);
                        this.move(this.vars.activeSlide+1, this.vars.width, finishSpeed);
                    }
                }
            }

            // kill touchmove and touchend event listeners until touchstart called again
            this.elem.removeEventListener('touchmove', this, false);
            this.elem.removeEventListener('touchend', this, false);
        },
        transitionEnd: function(event) {
			// transition end Callback
            if (this.vars.transitionEnd && typeof(this.vars.transitionEnd) === "function") {
                this.vars.transitionEnd();
            }
        },

        /* ----------------------------------
         * |      Private-ish functions     |
         * ---------------------------------- */

        /* Called on window resize
        resets variables regarding width/height of elements */
        onResize: function() {
            this.vars.width = this.vars.container.outerWidth();
            this.vars.height = this.vars.container.outerHeight();
        },

        /* -- Non-touch slide changes -- */
        changeSlides: function(to, type, speed) {
			var vars_local = this.vars;

            if (vars_local.activeSlide === to) return;

            if (vars_local.activeSlide < to && to == vars_local.totalSlides)
                to = 0;

            if (vars_local.activeSlide > to && to < 0)
                to = vars_local.totalSlides - 1;

            var pos = vars_local.totalSlides;

            while (pos--) {
                vars_local.$slides.eq(pos).css({
                    'opacity'   :   '',
                    '-webkit-transition'    :   '',
                    'transition'            :   '',
                    'width'                 :   '',
                    '-webkit-transform'     :   '',
                    'transform'             :   ''
                });
            }

            if (!vars_local.touched) {
                vars_local.$slides.eq(to).addClass("active transition-speed");
                vars_local.$slides.eq(vars_local.activeSlide).removeClass("active");

                vars_local.activeSlide = to;
            } else {
                setTimeout( function(){
                    vars_local.$slides.eq(to).addClass("transition-speed");
                    vars_local.$slides.eq(vars_local.activeSlide).addClass("transition-speed");

                    setTimeout( function(){
                        vars_local.$slides.eq(to).addClass("active");
                        vars_local.$slides.eq(vars_local.activeSlide).removeClass("active");

                        vars_local.activeSlide = to;
                        vars_local.touched = 0;
                    }, 1);

                }, 1);
            }

            // Slide change Callback
            if (this.vars.slideChange && typeof(this.vars.slideChange) === "function") {
                this.vars.slideChange();
            }
        },

        /* -- Add transition support for older browsers -- */
        animate: function(from, to, type, speed) { /* TODO (maybe.. I mean, who really cares about IE8) */ },

        /* -- Touch slide changes -- */
        move: function(index, dist, speed) {
            this.translate(index, dist, speed);
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

            // Slide change Callback
            if (this.vars.slideChange && typeof(this.vars.slideChange) === "function") {
                this.vars.slideChange();
            }
        },

        /* utility: a simple positive modulo using slides.length (from swipe.js) */
        circle: function(index) {

            return (this.vars.$slides.length + (index % this.vars.$slides.length)) % this.vars.$slides.length;
        },

        /* Automatic slideshow functions */
        begin: function() {

            this.interval = setTimeout(this.next(), this.vars.auto);
        },

        stop: function() {
            delay = 0;
            clearTimeout(this.interval);
        }
    };

    /* ------------------------------
     * |        Misc init           |
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