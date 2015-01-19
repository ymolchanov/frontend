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
                front = article.front,
                webUrl = article.props.webUrl();
            if (!front || !webUrl) {
                return;
            }

            front.sparklinesFor(webUrl).then(function (series) {
                if (!series) {
                    return;
                }

                new Highcharts.SparkLine({
                    chart: {
                        renderTo: element
                    },
                    series: series
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

    function getSomething (front, articles) {
        var deferred = new $.Deferred();

        authedAjax.request({
            url: 'banana?' + serializeParams(front, articles)
        }).then(function (data) {
            return data;
        }).fail(function (error) {
            deferred.resolve([{
                name: 'clickthrough',
                data: [2, 4, 5, 9]
            }]);
        });

        return deferred.promise();
    }

    return {
        load: getSomething
    };

    function serializeParams (front, articles) {
        var params = [];
        params.push('referall-url=' + encodeURIComponent('http://theguardian.com/' + front));
        params.push('urls=' + JSON.stringify(_.map(articles, function (article) {
            return encodeURIComponent(article);
        })));

        return params.join('&');
    }
});
