/* globals Highcharts, _ */
define([
    'modules/vars',
    'knockout',
    'modules/authed-ajax',
    'utils/mediator'
], function (
    vars,
    ko,
    authedAjax,
    mediator
) {
    ko.bindingHandlers.highcharts = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var article = bindingContext.$data;

            var listener = function (collection) {
                if (collection.contains(article)) {
                    refreshSparklines(article, element);
                }
            };
            mediator.on('collection:ready', listener);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                mediator.off('collection:ready', listener);
            });
        }
    };

    function refreshSparklines (article, element) {
        var front = article.front;

        if (!front) {
            return;
        }

        front.sparklinePromise.then(function (wholeData) {
            var webUrl = stripBaseUrl(article.props.webUrl() || ''),
                data = ((wholeData || {})[webUrl] || {}),
                series = data.series;

            if (!series || !series.length) {
                return;
            }

            article.sparkline = new Highcharts.SparkLine({
                chart: {
                    renderTo: element
                },
                series: _.map(series, function (value) {
                    return {
                        name: value.name,
                        data: _.map(value.data, function (point) {
                            return point.count;
                        })
                    };
                })
            }, data.totalHits);
        });
    }

    Highcharts.SparkLine = function (options, hits, callback) {
        var lineWidth = Math.min(Math.ceil(hits / 2000), 4),
            defaultOptions = {
            chart: {
                renderTo: (options.chart && options.chart.renderTo) || this,
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
                text: '' + hits,
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
                    lineWidth: lineWidth,
                    shadow: false,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    marker: {
                        radius: 1
                    },
                    fillOpacity: 0.2,
                    dataLabels: {
                        enabled: false,
                        formatter: function () {
                            if (this.y) {
                                return this.y + '<br>' + (this.y / hits * 100).toFixed(1)+ '%';
                            }
                        },
                        style: {
                            fontSize: '7px'
                        },
                        useHTML: true
                    }
                },
                column: {
                    negativeColor: '#910000',
                    borderColor: 'silver'
                }
            }
        };
        options = Highcharts.merge(defaultOptions, options);

        return new Highcharts.Chart(options, callback);
    };

    function getHistogram (front, articles) {
        var deferred = new $.Deferred().resolve({});

        // Allow max articles in one request or the GET request is too big
        var maxArticles = 15;
        _.each(_.range(0, articles.length, maxArticles), function (limit) {
            deferred = deferred.then(function (memo) {
                return reduceRequest(memo, front, articles.slice(limit, Math.min(limit + maxArticles, articles.length - 1)));
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
            return params.push('path=' + stripBaseUrl(article));
        });
        params.push('hours=1');
        params.push('interval=10');

        return params.join('&');
    }

    var baseUrl = 'http://www.theguardian.com';
    function stripBaseUrl (url) {
        if (url.indexOf(baseUrl) === 0) {
            return url.substring(baseUrl.length);
        }
        return url;
    }

    return {
        load: getHistogram
    };
});
