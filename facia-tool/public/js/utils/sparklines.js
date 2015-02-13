/* globals Highcharts, _ */
define([
    'modules/vars',
    'knockout',
    'modules/authed-ajax',
    'utils/mediator',
    'utils/url-abs-path'
], function (
    vars,
    ko,
    authedAjax,
    mediator,
    urlAbsPath
) {
    var subscribedFronts = [],
        pollingId;

    ko.bindingHandlers.highcharts = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            showSparklinesInArticle(element, bindingContext.$data);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                var $element = $(element),
                    chart = $element.data('sparklines');
                if (chart) {
                    chart.destroy();
                    $element.removeData('sparklines');
                }
            });
        },
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            showSparklinesInArticle(element, bindingContext.$data);
        }
    };

    function showSparklinesInArticle (element, article) {
        var front = article.front,
            webUrl = getWebUrl(article),
            data, series, chart = $(element).data('sparklines');

        if (!front || !front.sparklines || !webUrl) {
            return;
        }

        data = front.sparklines.data()[webUrl] || {};
        series = data.series;
        if (!series || !series.length) {
            return;
        }

        if (chart) {
            chart.destroy();
        }
        chart = createSparklikes(element, data.totalHits, _.map(series, function (value) {
            return {
                name: value.name,
                data: _.map(value.data, function (point) {
                    return point.count;
                })
            };
        }));
        $(element).data('sparklines', chart);
        return chart;
    }

    function createSparklikes (element, totalHits, series) {
        var lineWidth = Math.min(Math.ceil(totalHits / 2000), 4);

        return new Highcharts.Chart({
            chart: {
                renderTo: element
            },
            title: {
                text: '' + totalHits
            },
            plotOptions: {
                series: {
                    lineWidth: lineWidth
                }
            },
            series: series
        });
    }

    function loadSparklinesForFront (front) {
        if (!front.front()) {
            return;
        }

        var deferred = new $.Deferred(),
            referrerFront = front.front();

        $.when.apply($, _.map(front.collections(), function (collection) {
            return collection.loaded;
        })).then(function () {
            if (referrerFront !== front.front()) {
                deferred.reject();
                return;
            }

            getHistogram(
                front.front(),
                allWebUrls(front)
            ).then(function (data) {
                if (referrerFront !== front.front()) {
                    deferred.reject();
                } else {
                    front.sparklines.data(data);
                    deferred.resolve(data);
                }
            });
        });

        if (!front.sparklines) {
            front.sparklines = {
                data: ko.observable({})
            };
        }
        front.sparklines.promise = deferred.promise();
    }

    function allWebUrls (front) {
        var all = [];
        _.each(front.collections(), function (collection) {
            collection.eachArticle(function (article) {
                var webUrl = getWebUrl(article);
                if (webUrl) {
                    all.push(webUrl);
                }
            });
        });
        return all;
    }

    function differential (collection) {
        var front = collection.front,
            data, newArticles = [];

        if (!front || !front.sparklines || front.sparklines.promise.state() !== 'resolved') {
            return;
        }

        data = front.sparklines.data();
        collection.eachArticle(function (article) {
            var webUrl = getWebUrl(article);
            if (webUrl && !data[webUrl]) {
                newArticles.push(webUrl);
            }
        });

        if (newArticles.length) {
            var deferred = new $.Deferred(),
                referrerFront = front.front();

            getHistogram(
                front.front(),
                newArticles
            ).then(function (newData) {
                if (referrerFront !== front.front()) {
                    deferred.reject();
                } else {
                    _.each(newArticles, function (webUrl) {
                        data[webUrl] = newData[webUrl];
                    });
                    front.sparklines.data(data);
                    deferred.resolve(data);
                }
            });

            front.sparklines.promise = deferred.promise();
        }
    }

    function getHistogram (front, articles) {
        var deferred = new $.Deferred().resolve({});

        // Allow max articles in one request or the GET request is too big
        var maxArticles = vars.CONST.sparksBatchQueue;
        _.each(_.range(0, articles.length, maxArticles), function (limit) {
            deferred = deferred.then(function (memo) {
                return reduceRequest(memo, front, articles.slice(limit, Math.min(limit + maxArticles, articles.length)));
            });
        });

        return deferred;
    }

    function reduceRequest (memo, front, articles) {
        var deferred = new $.Deferred();

        authedAjax.request({
            url: '/ophan/histogram?' + serializeParams(front, articles)
        }).then(function (data) {
            _.each(data, function (content) {
                memo[content.path] = content;
            });

            deferred.resolve(memo);
        }).fail(function (error) {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function serializeParams (front, articles) {
        var params = [];

        params.push('referring-path=/' + front);
        _.map(articles, function (article) {
            return params.push('path=' + article);
        });
        params.push('hours=1');
        params.push('interval=10');

        return params.join('&');
    }

    function startPolling () {
        if (!pollingId) {
            var period = vars.CONST.sparksRefreshMs || 60000;
            setInterval(function () {
                _.each(subscribedFronts, function (front) {
                    loadSparklinesForFront(front, true);
                });
            }, period);
        }
    }

    function stopPolling () {
        if (pollingId) {
            clearInterval(pollingId);
        }
    }

    function subscribe (widget) {
        if (subscribedFronts.length === 0) {
            startPolling();
            mediator.on('collection:populate', differential);
        }
        subscribedFronts.push(widget);
        loadSparklinesForFront(widget);
        widget.collections.subscribe(function () {
            loadSparklinesForFront(widget);
        });
    }

    function unsubscribe (widget) {
        subscribedFronts = _.without(subscribedFronts, widget);
        if (subscribedFronts.length === 0) {
            stopPolling();
            mediator.on('collection:populate', differential);
        }
    }

    Highcharts.setOptions({
        chart: {
            renderTo: null,
            backgroundColor: null,
            borderWidth: 0,
            type: 'area',
            margin: [0, 0, 0, 0],
            width: 125,
            height: 34,
            style: {
                overflow: 'visible'
            },
            skipClone: true
        },
        title: {
            text: '',
            style: {
                fontSize: '10px'
            },
            align: 'right',
            verticalAlign: 'bottom'
        },
        credits: {
            enabled: false
        },
        xAxis: {
            labels: {
                enabled: false
            },
            title: {
                text: null
            },
            startOnTick: false,
            endOnTick: false,
            tickPositions: []
        },
        yAxis: {
            endOnTick: false,
            startOnTick: false,
            labels: {
                enabled: false
            },
            title: {
                text: null
            },
            tickPositions: [0]
        },
        legend: {
            enabled: false
        },
        tooltip: {
            backgroundColor: null,
            borderWidth: 0,
            shadow: false,
            useHTML: true,
            hideDelay: 0,
            shared: true,
            padding: 0,
            positioner: function (w, h, point) {
                return { x: point.plotX - w / 2, y: point.plotY - h};
            }
        },
        plotOptions: {
            series: {
                animation: false,
                lineWidth: 1,
                shadow: false,
                marker: {
                    radius: 1
                },
                fillOpacity: 0.2
            },
            column: {
                borderColor: 'silver'
            }
        }
    });

    function getWebUrl (article) {
        var url = urlAbsPath(article.props.webUrl());
        if (url) {
            return '/' + url;
        }
    }

    return {
        subscribe: subscribe,
        unsubscribe: unsubscribe
    };
});
