/* globals Highcharts, _ */
define([
    'knockout',
    'modules/authed-ajax'
], function (
    ko,
    authedAjax
) {
    ko.bindingHandlers.highcharts = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var article = bindingContext.$data,
                front = article.front;

            if (!front) {
                return;
            }

            front.sparklinePromise.then(function (wholeData) {
                var webUrl = stripBaseUrl(article.props.webUrl() || ''),
                    data = ((wholeData || {})[webUrl] || {}).series;

                if (!data || !data.length) {
                    return;
                }

                article.sparkline = new Highcharts.SparkLine({
                    chart: {
                        renderTo: element
                    },
                    series: _.map(data, function (series) {
                        return {
                            name: series.name,
                            data: _.map(series.data, function (point) {
                                return point.count;
                            })
                        };
                    })
                });
            });
        }
    };

    Highcharts.SparkLine = function (options, callback) {
        var defaultOptions = {
            chart: {
                renderTo: (options.chart && options.chart.renderTo) || this,
                backgroundColor: null,
                borderWidth: 0,
                type: 'area',
                margin: [0, 0, 0, 0],
                width: 125,
                height: 30,
                style: {
                    overflow: 'visible'
                },
                skipClone: true
            },
            title: {
                text: ''
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
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    marker: {
                        radius: 1,
                        states: {
                            hover: {
                                radius: 2
                            }
                        }
                    },
                    fillOpacity: 0.25
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
        var deferred = new $.Deferred();

        authedAjax.request({
            url: 'http://api.ophan.co.uk/api/histogram?' + serializeParams(front, articles),
            dataType: 'jsonp',
            type: 'jsonp'
        }).then(function (data) {
            var structured = {};

            _.each(data, function (content) {
                // var object = content;
                // object.series = {
                //     original: content.series
                // };
                // _.each(object.series.original, function (series) {
                //     object.series[series.name] = series.data;
                // });
                structured[content.path] = content;
            });

            deferred.resolve(structured);
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
        params.push('interval=15');

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
