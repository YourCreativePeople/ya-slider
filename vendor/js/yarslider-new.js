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

    // ------------------------------
    // |          Utilities         |
    // ------------------------------
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

        /* Utility functions */
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

    // ------------------------------
    // |      Global Variables      |
    // ------------------------------
    var defaults, metadata, options;
    var vars = {
        width:              0,
        height:             0,
        startSlide:         0,
        activeSlide:        0,
        totalSlides:        0,
        pagerTotal:         0,
        auto:               0,
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
        transitionType:     'fade',
        continuous:         true,
        disableScroll:      false,
        stopPropogation:    false,
        sliding:            false,
        debug:              1,
        touches:            null,
        delta:              null,
        isScrolling:        null,
        start:              null,
        touched:            0
    };

    // ------------------------------
    // |       Event Capturing      |
    // ------------------------------
    var events = {

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

            if (vars.stopPropagation) event.stopPropagation();
        },
        start: function(event) {
            vars.touches = event.touches[0];
            vars.touched += 1;

            $(vars.container).removeClass('no-touch');
            vars.$slides.eq(vars.activeSlide).removeClass("transition-speed");
            // measure start values
            vars.start = {
                // get initial touch coords
                x: vars.touches.pageX,
                y: vars.touches.pageY,

                // store time to determine touch duration
                time: +new Date
            };

            // used for testing first move event
            vars.isScrolling = undefined;

            // reset delta and end measurements
            vars.delta = {};

            var pos = vars.totalSlides;

            if (vars.touched == 1) {
                while(pos--) {
                    var slide = vars.$slides[pos];

                    slide.style.width = vars.width + 'px';
                    slide.setAttribute('data-index', pos);

                    vars.$slides.eq(pos).removeClass("transition-speed");

                    if (browser.transitions) {
                        slide.style.opacity = 1;

                        if ( pos == vars.totalSlides - 1 && vars.activeSlide === 0 ) {
                            vars.slidePos[pos] = -((vars.activeSlide + 1) * vars.width);
                            if (vars.touched == 1)
                                translate(pos, -((vars.activeSlide + 1) * vars.width), 0);
                        } else if ( pos === 0 && vars.activeSlide == vars.totalSlides - 1 ) {
                            vars.slidePos[pos] = vars.width;
                            if (vars.touched == 1)
                                translate(pos, vars.width, 0);
                        } else {
                            vars.slidePos[pos] = ((pos * vars.width) - (vars.activeSlide * vars.width));
                            if (vars.touched == 1)
                                translate(pos, ((pos * vars.width) - (vars.activeSlide * vars.width)), 0);
                        }
                    }
                }
            }

            // attach touchmove and touchend listeners
            vars.elem.addEventListener('touchmove', this, false);
            vars.elem.addEventListener('touchend', this, false);

        },
        move: function(event) {
            // ensure swiping with one touch and not pinching
            if ( event.touches.length > 1 || event.scale && event.scale !== 1) return;

            if (vars.disableScroll) event.preventDefault();

            vars.touches = event.touches[0];

            // measure change in x and y
            vars.delta = {
                x: vars.touches.pageX - vars.start.x,
                y: vars.touches.pageY - vars.start.y
            };

            // determine if scrolling test has run - one time test
            if ( typeof isScrolling == 'undefined') {
                vars.isScrolling = !!( vars.isScrolling || Math.abs(vars.delta.x) < Math.abs(vars.delta.y) );
            }

            // if user is not trying to scroll vertically
            if (!vars.isScrolling) {

                // prevent native scrolling
                event.preventDefault();

                // stop slideshow
                stop();

                // increase resistance if first or last slide
                if (vars.continuous) { // we don't add resistance at the end

                    translate(circle(vars.activeSlide-1), vars.delta.x + vars.slidePos[circle(vars.activeSlide-1)], 0);
                    translate(vars.activeSlide, vars.delta.x + vars.slidePos[vars.activeSlide], 0);
                    translate(circle(vars.activeSlide+1), vars.delta.x + vars.slidePos[circle(vars.activeSlide+1)], 0);

                } else {

                    vars.delta.x =
                        vars.delta.x /
                        ( (!vars.activeSlide && vars.delta.x > 0                // if first slide and sliding left
                            || vars.activeSlide == vars.$slides.length - 1      // or if last slide and sliding right
                                && vars.delta.x < 0                     // and if sliding at all
                    ) ?
                        ( Math.abs(vars.delta.x) / vars.width + 1 )     // determine resistance level
                        : 1 );                                          // no resistance if false

                    // translate 1:1
                    translate(vars.activeSlide-1, vars.delta.x + vars.slidePos[vars.activeSlide-1], 0);
                    translate(vars.activeSlide, vars.delta.x + vars.slidePos[vars.activeSlide], 0);
                    translate(vars.activeSlide+1, vars.delta.x + vars.slidePos[vars.activeSlide+1], 0);
                }

            }
        },
        end: function(event) {
            // measure duration
            var duration = new Date().getTime() - vars.start.time;

            // determine if slide attempt triggers next/prev slide
            //  // if slide duration is less than 250ms
            //  // and if slide amt is greater than 20px
            //  // or if slide amt is greater than half the width
            var isValidSlide =
                Number(duration) < 250 && Math.abs(vars.delta.x) > 20 || Math.abs(vars.delta.x) > vars.width/2;

            // determine if slide attempt is past start and end
            var isPastBounds =
                !vars.activeSlide && vars.delta.x > 0 || vars.activeSlide == vars.$slides.length - 1 && vars.delta.x < 0;

            if (vars.continuous) isPastBounds = false;

            // determine direction of swipe (true:right, false:left)
            var direction = vars.delta.x < 0;

            // determine speed to finish slide
            var finishSpeed = ( Number(duration) / ( Math.abs(vars.delta.x) / vars.width ) );
            if (finishSpeed > 1000)
                finishSpeed = 1000;

            // if not scrolling vertically
            if (!vars.isScrolling) {

                if (isValidSlide && !isPastBounds) {

                    var from = vars.activeSlide;

                    if (direction) {
                        if (vars.continuous) { // we need to get the next in this direction in place
                            move(circle(vars.activeSlide-1), -vars.width, 0);
                            move(circle(vars.activeSlide+2), vars.width, 0);
                        } else {
                            move(vars.activeSlide-1, -vars.width, 0);
                        }

                        move(vars.activeSlide, vars.slidePos[vars.activeSlide]-vars.width, finishSpeed);
                        move(circle(vars.activeSlide+1), vars.slidePos[circle(vars.activeSlide+1)]-vars.width, finishSpeed);
                        vars.activeSlide = circle(vars.activeSlide+1);
                    } else {
                        if (vars.continuous) { // we need to get the next in this direction in place
                            move(circle(vars.activeSlide+1), vars.width, 0);
                            move(circle(vars.activeSlide-2), -vars.width, 0);
                        } else {
                            move(vars.activeSlide+1, vars.width, 0);
                        }

                        move(vars.activeSlide, vars.slidePos[vars.activeSlide]+vars.width, finishSpeed);
                        move(circle(vars.activeSlide-1), vars.slidePos[circle(vars.activeSlide-1)]+vars.width, finishSpeed);
                        vars.activeSlide = circle(vars.activeSlide-1);
                    }


                    // vars.callback && vars.callback(vars.activeSlide, slides[vars.activeSlide]);

                    vars.$slides.eq(vars.activeSlide).addClass("active");
                    vars.$slides.eq(from).removeClass("active");

                } else {

                    if (vars.continuous) {
                        move(circle(vars.activeSlide-1), -vars.width, finishSpeed);
                        move(vars.activeSlide, 0, finishSpeed);
                        move(circle(vars.activeSlide+1), vars.width, finishSpeed);
                    } else {
                        move(vars.activeSlide-1, -vars.width, finishSpeed);
                        move(vars.activeSlide, 0, finishSpeed);
                        move(vars.activeSlide+1, vars.width, finishSpeed);
                    }
                }
            }

            // kill touchmove and touchend event listeners until touchstart called again
            vars.elem.removeEventListener('touchmove', events, false)
            vars.elem.removeEventListener('touchend', events, false)
        },
        transitionEnd: function(event) {
        }
    };

    // ------------------------------
    // |     Plugin constructor     |
    // ------------------------------
    var YarSlider = function( elem, input_options ){
        this.elem = elem;
        vars.elem = this.elem;
        this.$elem = $(elem);
        options = input_options;

        // This next line takes advantage of HTML5 data attributes
        // to support customization of the plugin on a per-element
        // basis. For example,
        // <div class=item' data-plugin-options='{"message":"Goodbye World!"}'></div>
        metadata = this.$elem.data( "slider-options" );
        this.init();
    };

    // ------------------------------
    // |      Plugin prototype      |
    // ------------------------------
    var pm = YarSlider.prototype = {

        //User Editable variables (on init)
        defaults: {
            startSlide:         0,
            durationManual:     500,
            durationAuto:       200,
            continuous:         true,
            disableScroll:      false,
            stopPropogation:    false,
            auto:               1000,
            slideSelector:      '.yar-slide',
            controlsSelector:   '.yar-slider-controls',
            slideChange:        function () {},
            transitionEnd:      function () {},
            initFinished:       function () {}
        },

        //Setup main elements
        init: function() {
            // Introduce defaults that can be extended either
            // globally or using an object literal.
            vars = $.extend( {}, vars, pm.defaults, options, metadata );

            console.log(vars);

            // Set up container
            vars.container = this.$elem;
            vars.containerSelector = "."  + vars.container.attr('class');
            vars.container.addClass('no-touch');

            // Set up slides
            vars.$slides = vars.container.children();
            vars.totalSlides = vars.$slides.length;
            console.log(vars.totalSlides);
            vars.pagerTotal = vars.totalSlides;
            var pagerList = $('.pager-list');

            vars.slidePos = new Array(vars.totalSlides);

            if (vars.totalSlides == 1) {
                var imageSelector = vars.containerSelector + ".no-touch " + vars.slideSelector + " .image";
                var captionSelector = vars.containerSelector + ".no-touch " + vars.slideSelector + " .caption";
                $(imageSelector).css('opacity', 1);
                $(captionSelector).css('opacity', 1);
                vars.container.css({'opacity': 1});

                $(vars.slideSelector).css('opacity', 0);
                return false;
            }

            if (browser.transitions && vars.totalSlides < 3) {
                vars.$slides[0].parentNode.appendChild(vars.$slides[0].cloneNode(true));
                vars.$slides[0].parentNode.insertBefore(vars.$slides[1].cloneNode(true), vars.$slides[0].parentNode.firstChild);
                vars.$slides = vars.container.children();
                vars.totalSlides = 4;
            }

            /* Set some important variables */
            onResize();

            /* Set startSlide */
            if (vars.startSlide > 0) {
                if(vars.startSlide >= vars.totalSlides) {
                    vars.startSlide = vars.totalSlides - 1;
                }
                vars.activeSlide = vars.startSlide;

            } else {
                vars.activeSlide = 0;
            }

            vars.$slides.eq(vars.activeSlide).addClass('active transition-speed');

            /* Add Pagination List elements */
            for (var i = 0; i < vars.pagerTotal; i++)
            {
                pagerList.append('<li data-index="' + i + '">' + (i+1) + '</li>');
            }

            // Add event listeners for pager
            vars.container.next().children('.pager').click(function(){
                console.log('click pager');
                vars.container.addClass('no-touch');
                if ($(this).hasClass('prev'))
                    pm.prev();
                else
                    pm.next();
            });

            $(vars.controlSelector + ' .pager-list li').click(function(){
                vars.container.addClass('no-touch');
                var pos = vars.totalSlides;

                pm.toSlide($(this).index(), 'fade', vars.durationAuto);
            });

            // add event listeners
            if (browser.addEventListener) {

                // set touchstart event on element
                if (browser.touch) this.elem.addEventListener('touchstart', events, false);

                if (browser.transitions) {
                    this.elem.addEventListener('webkitTransitionEnd', events, false);
                    this.elem.addEventListener('msTransitionEnd', events, false);
                    this.elem.addEventListener('oTransitionEnd', events, false);
                    this.elem.addEventListener('otransitionend', events, false);
                    this.elem.addEventListener('transitionend', events, false);
                }
                    // set resize event on window
                    window.addEventListener('resize', events, false);
            }

            changeSlides(vars.activeSlide, 'fade', vars.durationAuto);

            // show main container after initializing (no jumping in)
            vars.container.css({'opacity': 1});

            vars.initFinished();

            return this;
        },

        // Show previous slide
        prev: function() {

            changeSlides(vars.activeSlide - 1, vars.transitionType, vars.durationAuto);
        },

        // Show next slide
        next: function() {

            changeSlides(vars.activeSlide + 1, vars.transitionType, vars.durationAuto);
        },

        // Set current to index (type: slide/fade - duration: speed in milliseconds)
        toSlide: function(index, type, duration) {

            changeSlides(index, type, duration);
        },

        // Return current slide index (start at 0)
        getPos: function() {

            return vars.activeSlide;
        },

        // Return number of slides in slideshow
        getNumSlides: function() {

            return vars.totalSlides;
        },

        // Clean up slider
        destroy: function () {
            // unset Plugin data instance
            this.element.data( dataPlugin, null );
        }
    };

    // ------------------------------
    // |      Private functions     |
    // ------------------------------

        /* -- Non-touch slide changes -- */
    function changeSlides(to, type, speed) {

        if (vars.activeSlide === to) return;

        if (vars.activeSlide < to && to == vars.totalSlides)
            to = 0;

        if (vars.activeSlide > to && to < 0)
            to = vars.totalSlides - 1;

        var pos = vars.totalSlides;

        while (pos--) {
            vars.$slides.eq(pos).css({
                'opacity'   :   '',
                '-webkit-transition'    :   '',
                'transition'            :   '',
                'width'                 :   '',
                '-webkit-transform'     :   '',
                'transform'             :   ''
            });
        }

        if (!vars.touched) {
            vars.$slides.eq(to).addClass("active transition-speed");
            vars.$slides.eq(vars.activeSlide).removeClass("active");

            vars.activeSlide = to;
        } else {
            setTimeout( function(){
                vars.$slides.eq(to).addClass("transition-speed");
                vars.$slides.eq(vars.activeSlide).addClass("transition-speed");

                setTimeout( function(){
                    vars.$slides.eq(to).addClass("active");
                    vars.$slides.eq(vars.activeSlide).removeClass("active");

                    vars.activeSlide = to;
                    vars.touched = 0;
                }, 1);

            }, 1);
        }
    }

        /* -- a simple positive modulo using slides.length (from swipe.js) -- */
    function circle(index) {

        return (vars.$slides.length + (index % vars.$slides.length)) % vars.$slides.length;
    }

        /* Add support for older browsers */
    function animate(from, to, type, speed) { }


    function move(index, dist, speed) {

        translate(index, dist, speed);
        vars.slidePos[index] = dist;
    }

    function translate(index, dist, speed) {
        var slide = vars.$slides[index];
        var style = slide && slide.style;

        var slidePrev = vars.$slides[index + 1];
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
    }

    // setup automatic slideshow
    var delay = pm.defaults.auto;
    var interval;

    function begin() {
        interval = setTimeout(pm.next, delay);
    }

    function stop() {
        delay = 0;
        clearTimeout(interval);
    }

        /* Called on window resize
            resets variables regarding width/height of elements */
    function onResize() {
        vars.width = vars.container.outerWidth();
        vars.height = vars.container.outerHeight();
    }

    // ------------------------------
    // |        Misc init           |
    // ------------------------------
    // Encapsulate defaults into prototype
    YarSlider.defaults = YarSlider.prototype.defaults;
    window.YarSlider = YarSlider;

    $.fn[pluginName] = function(options) {
        return this.each(function() {
            new Plugin(this, options);
        });
    };

})( jQuery, window , document );