/* Gulp File
    v 0.1.1
*/
var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    uglify      = require('gulp-uglify'),
    concat      = require('gulp-concat'),
    livereload  = require('gulp-livereload'),
    watch       = require('gulp-watch'),
    less        = require('gulp-less'),
    minifyCSS   = require('gulp-minify-css'),
    filesize    = require('gulp-filesize');

var EXPRESS_PORT = 4005;
var EXPRESS_ROOT = __dirname;

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

    gutil.log('Express Server on Port ' + gutil.colors.bgBlue.white(' ' + EXPRESS_PORT + ' '));
});

gulp.task('js', function () {
    return gulp.src(paths.scripts)
        .pipe(filesize())
        .pipe(uglify())
        .pipe(concat('yarslider.min.js'))
        .pipe(gulp.dest('build/js'))
        // .pipe(filesize())
        .on('error', gutil.log)
        .pipe(livereload());
});

gulp.task('less', function () {
    return gulp.src(paths.styles)
        .pipe(less())
        .pipe(filesize())
        // .pipe(minifyCSS())
        .pipe(concat('yarslider.min.css'))
        .pipe(gulp.dest('build/css'))
        .pipe(livereload());
});

// Rerun the task when a file changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['js']);
    gulp.watch(paths.styles, ['less']);
    gulp.watch("*.html", livereload);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch', 'server', 'js', 'less']);