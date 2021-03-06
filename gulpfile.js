var gulp = require('gulp');
var del = require('del');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');

var args = {};
args.env = 'dev';
if(process.argv.length > 2) {
    var arr = process.argv.slice(2);
    args.target = arr[0];
    for (var i = 0; i < arr.length; i++) {
        var argName = arr[i];
        if(argName.match(/-\w+/i)) {
            args[argName.slice(1)] = arr[i + 1];
        }
    }
}

var outDir = args.target == 'build:dev' ? '.' : 'dist';
var jsMinSuffix = '.min';

gulp.task('clean', function () {
    if( outDir != '.') {
        console.log('Deleting output directory: ' + outDir);
        del([outDir]);
    }
});

gulp.task('version', ['clean'], function() {
    if(typeof args.v == "undefined") {
        console.log("version task requires version number argument.");
        console.log("E.g. gulp release 1.2.3");
        return;
    }
    return gulp.src(['siteorigin-panels.php', 'readme.txt'])
        .pipe(replace(/(Stable tag:).*/, '$1 '+args.v))
        .pipe(replace(/(Version:).*/, '$1 '+args.v))
        .pipe(replace(/(define\('SITEORIGIN_PANELS_VERSION', ').*('\);)/, '$1'+args.v+'$2'))
        .pipe(replace(/(define\('SITEORIGIN_PANELS_JS_SUFFIX', ').*('\);)/, '$1' + jsMinSuffix + '$2'))
        .pipe(gulp.dest('tmp'));
});

gulp.task('less', ['clean'], function() {
    return gulp.src(
        [
            'css/**/*.less',
            '!css/mixins.less',
            'settings/**/*.less',
            '!widgets/**/styles/*.less',
            '!widgets/less/*.less'
        ], {base: '.'})
        .pipe(less({paths: ['widgets/less'], compress: args.target == 'build:release'}))
        .pipe(gulp.dest('tmp'));
});

gulp.task('concat', ['clean'], function () {

});

gulp.task('minify', ['concat'], function () {
    return gulp.src(
        [
            'js/**/*.js',
            'settings/**/*.js',
            'widgets/**/*.js',
            '!{tmp,tmp/**}'       // Ignore tmp/ and contents
        ], {base: '.'})
        // This will output the non-minified version
        .pipe(gulp.dest('tmp'))
        .pipe(rename({ suffix: jsMinSuffix }))
        .pipe(uglify())
        .pipe(gulp.dest('tmp'));
});

gulp.task('copy', ['version', 'less', 'minify'], function () {
    return gulp.src(
        [
            '**/!(*.js|*.less)',               // Everything except .js and .less files
            'widgets/less/*.less',              // LESS libraries used in runtime styles
            'widgets/**/styles/*.less',         // All the widgets' runtime .less files
            '!widgets/**/styles/*.css',         // Don't copy any .css files compiled from runtime .less files
            '!{node_modules,node_modules/**}',  // Ignore node_modules/ and contents
            '!{tests,tests/**}',                // Ignore tests/ and contents
            '!{tmp,tmp/**}',                  // Ignore dist/ and contents
            '!phpunit.xml',                     // Not the unit tests configuration file.
            '!siteorigin-panels.php',           // Not the base plugin file. It is copied by the 'version' task.
            '!readme.txt'                       // Not the readme.txt file. It is copied by the 'version' task.
        ], {base: '.'})
        .pipe(gulp.dest('tmp'));
});

gulp.task('move', ['copy'], function () {
    return gulp.src('tmp/**')
        .pipe(gulp.dest(outDir + '/siteorigin-panels'));
});

gulp.task('build:release', ['move'], function () {
    del(['tmp']);
    var versionNumber = args.hasOwnProperty('v') ? args.v : 'dev';
    return gulp.src(outDir + '/**/*')
        .pipe(zip('siteorigin-panels.' + versionNumber + '.zip'))
        .pipe(gulp.dest(outDir));
});

gulp.task('build:dev', ['less'], function () {
    console.log('Watching LESS files...');
    gulp.watch([
        'css/**/*.less',
        '!css/mixins.less',
        'settings/**/*.less',
        '!widgets/**/styles/*.less',
        '!widgets/less/*.less'
    ], ['less']);
});

gulp.task('default', ['build:release'], function () {

});