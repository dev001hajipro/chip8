var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var beautify = require('gulp-beautify');

gulp.task('init', function() {
  browserSync.init({
    server: {
      baseDir: './',
    },
    browser: 'chrome'
  });
});
gulp.task('reload', function(done) {
  browserSync.reload();
  done();
});

gulp.task('beautify', function() {
  gulp.src('./*.js')
    .pipe(beautify({
      indent_size: 2
    }))
    .pipe(gulp.dest('./tmp'))
});

gulp.task('default', ['init'], function() {
  gulp.watch('./*.js', ['reload']);
  gulp.watch('./*.css', ['reload']);
  gulp.watch('./*.html', ['reload']);
});