module.exports = function(config) {
    var settings = new require('./settings.js')(config);
    settings.files.push(
        { pattern: 'static/test/javascripts/spec/common/myPopular.spec.js', included: false }
    );
    config.set(settings);
}
