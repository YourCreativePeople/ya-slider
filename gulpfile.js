/* Gulp File
    v 0.1.1
*/
// var lr          = require('tiny-lr');
var gulp        = require('gulp'),
    gutil       = require('gulp-util');
    uglify      = require('gulp-uglify'),
    concat      = require('gulp-concat'),
    livereload  = require('gulp-livereload'),
    watch       = require('gulp-watch'),
    less        = require('gulp-less'),
    minifyCSS   = require('gulp-minify-css');

var EXPRESS_PORT = 4003;
var EXPRESS_ROOT = __dirname;
var LIVERELOAD_PORT = 35730;

var lr;

var paths = {
  scripts:  ['js/*.js'],
  styles:   ['css/*.less']
};

gulp.task('server', function () {
    var express = require('express');
    var app = express();
    app.use(require('connect-livereload')());
    app.use(express.static(EXPRESS_ROOT));
    app.listen(EXPRESS_PORT);

    console.log('Express Server on Port ' + EXPRESS_PORT);
});

// gulp.task('lr', function () {
//     lr = require('tiny-lr')();
//     lr.listen(LIVERELOAD_PORT);

//     console.log('LiveReload Server on Port ' + LIVERELOAD_PORT);
// });

gulp.task('js', function () {
    return gulp.src(paths.scripts)
        .pipe(uglify())
        .pipe(concat('yarslider.min.js'))
        .pipe(gulp.dest('build/js'));
});

gulp.task('less', function () {
    console.log('less');
    return gulp.src(paths.styles)
        .pipe(less())
        // .pipe(minifyCSS())
        .pipe(concat('yarslider.min.css'))
        .pipe(gulp.dest('build/css'));
});

// Notifies livereload of changes detected
// by `gulp.watch()`
function notifyLivereload(event) {
    // `gulp.watch()` events provide an absolute path
    // so we need to make it relative to the server root
    var fileName = require('path').relative(EXPRESS_ROOT, event.path);

    lr.changed({
        body: {
            files: [fileName]
        }
    });
}

// Rerun the task when a file changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['js']);
    gulp.watch(paths.styles, ['less']);
    // gulp.watch('*.*', notifyLiveReload);

});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['server', 'js', 'less']);