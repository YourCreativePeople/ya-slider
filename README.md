# ya-slider

**Yet Another Slider**

Responsive touch slider with style. Kind of a fork of [bradbirdsall](https://github.com/bradbirdsall)'s awesome [SwipeJS](https://github.com/bradbirdsall/Swipe "Swipe") slider.

### Description

Ya Slider is quite similar to others out there, but has a few key differences. Basically it comes down to our designer wanting different transitions on desktop than on touch devices. He wanted it to fade nicely on desktop, and slide smoothly with 1:1 touch on mobile. We couldn't find anything out there that did what we needed, so we wrote our own (with touch event help from Swipe).

### Dependencies

You must run the following to develop for Ya-Slider. (If you just want to run it, the files you need are in the build folder)

`npm install`

This will install all dependencies. Ya-Slider builds with [GulpJS](http://gulpjs.com/) and uses [Express](http://expressjs.com/) for its development server.
Simply run

`gulp`

to start develpment server and script combining.

### Easy Setup

##### HTML structure

`
<div class="container">
    <div class="slider">
        <a class="slide">
            <div class="image"></div>
        </a>
    </div>
    <div class="slider_controls">
        <div class="pager prev" data-target="prev">&lsaquo;</div>
        <div class="pager next" data-target="next">&rsaquo;</div>
        <ul class="pager-list"></ul>
    </div>
</div>
`

Please use the included stylesheet to make sure all the containers are styles correctly. You can actually put anything inside the "slide" container. It's quite flexible and content should just fill container.

If you would like to add a caption that has a different animation on slide change, just add the following after the "image" container. You can control the animation in the css file.

`
<div class="caption"></div>
`

##### Javascript Init

Put the following at the bottom of your page after you include both the js and css files for ya-slider. This will initiate the slider.

`$( ".slider" ).yarslider();`

### Config Options

Ya-slider can take additional parameters on init.

- **startSlide** Integer (default:0) - Start slide
- **durationManual** Integer in ms - Duration for manual slide change (fade)
- **durationAuto** Integer in ms - Duration for automatic slide change (fade)
- **continuous** Boolean (default:true) - Wrap slideshow around ends
- **disableScroll** Boolean - Allow/disallow scrolling while sliding
- **stopPropogation** Boolean - Stop event propogation
- **auto** Integer in ms - Automatic slideshow timer
- **slideSelector** String - Slide selector class
- **controlsSelector** String - Slide controls class
- **slideChange** Function - Callback on slide change
- **transitionEnd** Function - Callback on transition end
- **initFinished** Function - Callback after init


