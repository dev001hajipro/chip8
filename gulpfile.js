var gulp = require('gulp');
var browserSync = require('browser-sync').create();

gulp.task('init', function() {
    browserSync.init({
        server: {
            baseDir :'./',
        },
        browser: 'chrome'
    });
});

gulp.task('reload', function(done) {
    browserSync.reload();
    done();
});

gulp.task('default', ['init'], function() {
    gulp.watch('./*.js', ['reload']);
    gulp.watch('./*.css', ['reload']);
    gulp.watch('./*.html', ['reload']);
});