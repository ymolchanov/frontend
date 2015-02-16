define([
    'test/utils/collections-loader',
    'test/utils/config-loader',
    'knockout',
    'utils/mediator'
], function(
    collectionsLoader,
    configLoader,
    ko,
    mediator
){
    var loaders = {
        'collections': collectionsLoader,
        'config': configLoader
    };

    return function sandbox (what) {
        var running;

        afterAll(function () {
            ko.cleanNode(window.document.body);
            running.unload();
            _.once.reset();
            mediator.removeAllListeners();
        });

        return function (description, test) {
            it(description, function (done) {
                if (!running) {
                    running = loaders[what]();
                }

                running.loader.then(function () {
                    test(done);
                });
            });
        };
    };
});
