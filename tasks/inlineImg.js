var fs      = require('fs'),
    path    = require('path'),
    mime    = require('mime'),
    _       = require('lodash'),
    cheerio = require('cheerio');

module.exports = function(grunt) {

    // inline images as base64 in css files
    var inline_images_css = function(cssFile, config, cb) {
        var imgRegex = /url\s?\(['"]?(.*?)(?=['"]?\))/gi,
            imageFiles = [],
            css = null,
            base = _.isUndefined(config.base) ? '' : config.base,
            processedImages = 0,
            match = [];

        // read css file contents
        css = fs.readFileSync(cssFile, 'utf-8');

        // Class FileMeta
        // Return an object with file properties that are useful to us
        function FileMeta (filePath) {
            this.originalPath = filePath;
            this.cleanPath = this.removeQueryString(filePath);
            this.extension = path.extname(this.cleanPath);
            this.verifiedPath = this.detectPath();
        }

        // remove any query params from path (for cache busting etc.)
        FileMeta.prototype.removeQueryString = function (filePath) {
            if (filePath.lastIndexOf('?') !== -1) {
                filePath = filePath.substr(0, filePath.lastIndexOf('?'));
            }
            return filePath;
        };

        // Path to the CSS file
        FileMeta.prototype.cssPath = path.dirname(cssFile);
        // Basepath as optionally supplied
        FileMeta.prototype.base = base;
        // try to detect true path according to different methods
        FileMeta.prototype.detectPath = function () {
            function verifyPath (filePath) {
                if (fs.existsSync(filePath)) {
                    grunt.log.write('Exists:', filePath, '\n');
                    return filePath;
                } else {
                    //grunt.verbose.error('Image file doesn´t exist:', filePath);
                }
            }
                // Method 1: "just use the path relative to the CSS"
            var found = verifyPath(this.cssPath + '/' + this.cleanPath);
            if (!found) found = verifyPath(this.base + '/' + this.cleanPath);
            if (!found) found = verifyPath(this.base + '/' + path.basename(this.cleanPath));

                // Method 3: Use the base + only the filename
                
            
            if (!found) {
                grunt.verbose.error('Image file doesn´t exist:', this.cleanPath);
            }
            return found;
        };
        FileMeta.prototype.mimetype = function() {
            return mime.lookup(this.verifiedPath);
        };
        FileMeta.prototype.toBase64 = function () {
            return fs.readFileSync(this.verifiedPath, 'base64');
        };
        // End Class FileMeta

        // Useful filters
        function filterOnlyImage (fileMeta) {
            var blackList = ['.css', '.eot', '.otf', '.ttf', '.woff'],
                disallowed = blackList.indexOf(fileMeta.extension) !== -1;
            
            if (disallowed) {
                grunt.verbose.warn('Excluded file:', fileMeta.cleanPath);
            }
            return !disallowed;
        }

        function filterOnlyExists (fileMeta) {
            return fileMeta.verifiedPath;
        }

        function filterOnlySmall (fileMeta) {
            if (!config.ie8) {
                return true;
            }
            var stats = fs.statSync(fileMeta.verifiedPath);
            var result = stats.size <= 32768;
            if (stats.result) {
                grunt.verbose.error('Image file not found: ' + match[1]);
            }
            return result;
        }
        // End useful filters

        // generate the array of images to process
        while (match = imgRegex.exec(css)) {
            var file = new FileMeta(match[1]);
            imageFiles.push(file);
        }

        imageFiles
            .filter(filterOnlyImage)
            .filter(filterOnlyExists)
            .filter(filterOnlySmall)
            .forEach(function (fileMeta) {
                var base64 = fileMeta.toBase64();
                var mimetype = fileMeta.mimetype();
                css = css.replace(fileMeta.originalPath, 'data:' + mimetype + ';base64,' + base64);
                processedImages++;
            }
        );

        // check if a callback is given
        if (_.isFunction(cb)) {
            grunt.log.ok('Inlined: ' + processedImages + ' Images in file: ' + cssFile);
            cb(cssFile, css);
        }
    };

    // inline images as base64 in html files
    var inline_images_html = function(htmlFile, config, cb) {
        var html = fs.readFileSync(htmlFile, 'utf-8'),
            processedImages = 0,
            $ = cheerio.load(html);

        // grab all <img/> elements from the document
        $('img').each(function (idx, elm) {
            var src = $(elm).attr('src'),
                imgPath = null,
                img = null,
                mimetype = null,
                inlineImgPath = null;

            // check if the image src is already a data attribute
            if (src.substr(0, 5) !== 'data:') {
                // figure out the image path and load it
                inlineImgPath = imgPath = path.join(path.dirname(htmlFile), src);
                img = fs.readFileSync(imgPath, 'base64');

                mimetype = mime.lookup(inlineImgPath);

                // check file size and ie8 compat mode
                if (img.length > 32768 && config.ie8 === true) {
                    // i hate to write this, but can´t wrap my head around
                    // how to do this better: DO NOTHING
                } else {
                    $(elm).attr('src', 'data:' + mimetype + ';base64,' + img);
                    processedImages++;
                }
            }

        });
        html = $.html();

        // check if a callback is given
        if (_.isFunction(cb)) {
            grunt.log.ok('Inlined: ' + processedImages + ' Images in file: ' + htmlFile);
            cb(htmlFile, html);
        }
    };

    grunt.registerTask('inlineImg', 'Inlines images as base64 strings in html and css files', function () {
        var config = grunt.config('inlineImg'),
        files = grunt.file.expand({filter: 'isFile'}, config.src);

        files.forEach(function (file) {
            var extname = path.extname(file),
            fileWriter = function (file, fileContents) {
                fs.writeFileSync(file, fileContents, 'utf-8');
            };

            // inline images in css files
            if (extname === '.css') {
                inline_images_css(file, config, fileWriter);
            }

            // inline images in html files
            if (extname === '.htm' || extname === '.html') {
                inline_images_html(file, config, fileWriter);
            }
        });
    });

};
