var path    = require('path'),
    which   = require('which'),
    helpers = require('../lib/helpers');

module.exports = function(grunt) {
    var _ = grunt.util._,
        processImageFiles = helpers(grunt).processImageFiles;

    // list of all executable jpeg optimizers
    var jpgTools = [{
            executable: 'jpegoptim',
            isAvailable: false,
            flags: ['-f', '--strip-all', '<quality>', '<inputFile>', '-d', '<outputFolder>']
        }, {
            executable: 'jpegtran',
            isAvailable: false,
            flags: ['-copy', 'none', '-optimize', '-progressive', '-outfile', '<outputFile>', '<inputFile>']
        }, {
            executable: 'jpegrescan',
            isAvailable: false,
            flags: ['<inputFile>', '<outputFile>']
        }];


    var jpg = ['.jpg', '.jpeg'];

	// rev task - reving is done in the `output/` directory
	grunt.registerTask('jpgmin', 'Optimizes .jpg images', function () {
		var config = grunt.config('jpgmin'),
			dest = config.dest,
			quality = config.quality,
			done = this.async(),
			jpgToolsLookedUp = 0,
			jpgToolsToCheck = jpgTools.length,
			files = grunt.file.expand({filter: 'isFile'}, config.src),
			jpgfiles = files.filter(function(file) {
				return !!~jpg.indexOf(path.extname(file).toLowerCase());
			});

		// collect informations about which png optimizers
		// are available on the system
		jpgTools.forEach(function (tool, idx) {
			which(tool.executable, function (err, info) {
				if (!_.isUndefined(info)) {
					jpgTools[idx].isAvailable = true;
				}

				jpgToolsLookedUp++;

				if (jpgToolsLookedUp === jpgToolsToCheck) {
					processImageFiles(jpgTools, jpgfiles, dest, quality, 'jpgmin', done);
				}
			});
		});
	});

};
