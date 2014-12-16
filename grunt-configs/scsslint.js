module.exports = function(grunt, options) {
    return {
        allFiles: [
            'static/src/stylesheets'
        ],
        'facia-tool': [
            'facia-tool/public/stylesheets'
        ],
        options: {
            bundleExec: true,
            config: '.scss-lint.yml',
            reporterOutput: null
        }
    };
};
