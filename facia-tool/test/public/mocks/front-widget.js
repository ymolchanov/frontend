define('mock-front-widget', [
    'knockout',
    'utils/mediator'
], function (
    ko,
    mediator
) {
    function createMockFront (frontId, description) {
        var deferreds = {},
            front = {
                front: ko.observable(frontId),
                collections: ko.observableArray()
            }
        ;

        if (description) {
            front.collections(applyDescription(front, deferreds, description));
        }

        front._resolveCollection = function (id) {
            deferreds[id].deferred.resolve();
            mediator.emit('collection:ready', deferreds[id].collection);
        };

        front._load = function (frontId, description) {
            front.front(frontId);
            front.collections(applyDescription(front, deferreds, description));
        };

        return front;
    }

    function applyDescription (front, deferreds, description) {
        var collections = [];

        Object.keys(description).forEach(function (key) {
            var collection = {},
                deferred = new $.Deferred(),
                articles = [];

            collection.loaded = deferred.promise();
            collection.eachArticle = function (callback) {
                articles.forEach(callback);
            };
            collection.contains = function (article) {
                var found = false;
                this.eachArticle(function (item) {
                    found = found || (item === article);
                });
                return found;
            };
            collection._items = articles;

            deferreds[key] = {
                deferred: deferred,
                collection: collection
            };
            collections.push(collection);

            description[key].forEach(function (articleDescription) {
                var article = {
                    props: {
                        webUrl: function () {
                            return articleDescription.article;
                        }
                    },
                    _name: articleDescription.article ? ('article: ' + articleDescription.article) : ('snap: ' + articleDescription.snap),
                    _id: (articleDescription.article || articleDescription.snap).replace(/\//g, '_'),
                    front: front
                };

                articles.push(article);
            });
        });

        return collections;
    }

    return createMockFront;
});
