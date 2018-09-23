'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Builder = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Builder = exports.Builder = function () {
    function Builder(panel, $element) {
        _classCallCheck(this, Builder);

        this.panel = panel;
        this.$element = $element;
        this.debug = false;

        this.updateThresholds();
    }

    _createClass(Builder, [{
        key: 'prepareData',
        value: function prepareData(range) {
            var _this = this;

            var seriesList = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];


            // Get panel width
            var panel = this.$element.find('ng-transclude.panel-height-helper');
            var panelWidthForDots = panel.width() - parseInt(this.panel.yAxisWidthPx) - 20; // 60 label +20 scrollbar buffer

            var dotWidth = parseInt(this.panel.widthPx) + 2 * parseInt(this.panel.marginPx);
            var dotCount = Math.floor(panelWidthForDots / dotWidth);
            var timeRangeSeconds = _moment2.default.duration(range.to.diff(range.from)).as('seconds');
            var secondsPerDot = timeRangeSeconds / dotCount;

            var dotsPerHeader = Math.max(1, parseInt(this.panel.xAxisDotRange));
            var headerCount = Math.floor(dotCount / dotsPerHeader);

            if (this.debug) {
                console.log({
                    panelWidthForDots: panelWidthForDots,
                    dotWidth: dotWidth,
                    dotCount: dotCount,
                    timeRangeSeconds: timeRangeSeconds,
                    secondsPerDot: secondsPerDot,
                    dotsPerHeader: dotsPerHeader,
                    headerCount: headerCount
                });
            }

            // create column header
            var columnHeaders = [];
            for (var i = 0; i < headerCount; i++) {
                // +1 because there are always the newest data points of a window shown as dot so that is more close to the data point
                var time = range.from.clone().add(secondsPerDot * (i * dotsPerHeader + 1), "seconds");
                columnHeaders.push({
                    text: time.format(this.panel.xAxisDateFormat),
                    color: this.panel.xAxisTextColor,
                    textSize: parseInt(this.panel.xAxisTextSize)
                });
            }

            // sort series by target
            seriesList.sort(function (seriesA, seriesB) {
                return seriesA.target < seriesB.target ? -1 : 1;
            });

            // update thresholds
            this.updateThresholds();

            // create row headers and rows
            var rowHeaders = [];
            var dotsSeries = [];

            seriesList.forEach(function (series) {
                var pointSeries = _this._compact(series.datapoints, range, secondsPerDot, dotCount);

                var dotSeries = [];
                for (var _i = 0; _i < dotCount; _i++) {
                    if (pointSeries[_i] === undefined) {
                        dotSeries.push({
                            name: series.target,
                            displayValue: "No Data",
                            timestamp: 0,
                            color: _this.panel.defaultColor
                        });
                    } else {
                        var point = pointSeries[_i];
                        dotSeries.push({
                            name: series.target,
                            displayValue: point[0],
                            timestamp: point[1],
                            color: _this._color(point[0])
                        });
                    }
                }
                rowHeaders.push({
                    text: series.target,
                    color: _this.panel.yAxisTextColor,
                    textSize: parseInt(_this.panel.yAxisTextSize)
                });

                dotsSeries.push({ dots: dotSeries });
            });

            return { columnHeaders: columnHeaders, rowHeaders: rowHeaders, dotsSeries: dotsSeries };
        }
    }, {
        key: '_compact',
        value: function _compact(datapoints, range, secondsPerDot, dotCount) {

            var startTime = new Date();

            var compacted = [];
            var buckets = Builder.compactToBuckets(datapoints, range, secondsPerDot, dotCount);
            switch (this.panel.compactionAlgorithm) {
                case "Last":
                    compacted = this.getCompactedBucketsLast(buckets);
                    break;
                case "First":
                    compacted = this.getCompactedBucketsFirst(buckets);
                    break;
                case "Max":
                    compacted = this.getCompactedBucketsMax(buckets);
                    break;
                case "Min":
                    compacted = this.getCompactedBucketsMin(buckets);
                    break;
                case "Average":
                    compacted = this.getCompactedBucketsAverage(buckets);
                    break;
            }

            console.log('onRender compact End: ' + (new Date() - startTime) + ' ms');
            return compacted;
        }
    }, {
        key: 'getCompactedBucketsLast',
        value: function getCompactedBucketsLast(buckets) {
            var compacted = [];
            _lodash2.default.forEach(buckets, function (bucket) {
                var point = _lodash2.default.maxBy(bucket, function (point) {
                    return point[1];
                });
                compacted.push(point);
            });
            return compacted;
        }
    }, {
        key: 'getCompactedBucketsFirst',
        value: function getCompactedBucketsFirst(buckets) {
            var compacted = [];
            _lodash2.default.forEach(buckets, function (bucket) {
                var point = _lodash2.default.minBy(bucket, function (point) {
                    return point[1];
                });
                compacted.push(point);
            });
            return compacted;
        }
    }, {
        key: 'getCompactedBucketsMax',
        value: function getCompactedBucketsMax(buckets) {
            var compacted = [];
            _lodash2.default.forEach(buckets, function (bucket) {
                var point = _lodash2.default.maxBy(bucket, function (point) {
                    return point[0];
                });
                compacted.push(point);
            });
            return compacted;
        }
    }, {
        key: 'getCompactedBucketsMin',
        value: function getCompactedBucketsMin(buckets) {
            var compacted = [];
            _lodash2.default.forEach(buckets, function (bucket) {
                var point = _lodash2.default.minBy(bucket, function (point) {
                    return point[0];
                });
                compacted.push(point);
            });
            return compacted;
        }
    }, {
        key: 'getCompactedBucketsAverage',
        value: function getCompactedBucketsAverage(buckets) {
            var compacted = [];
            _lodash2.default.forEach(buckets, function (bucket) {
                var point0 = _lodash2.default.meanBy(bucket, function (point) {
                    return point[0];
                });
                var point1 = _lodash2.default.meanBy(bucket, function (point) {
                    return point[1];
                });
                compacted.push([point0, point1]);
            });
            return compacted;
        }
    }, {
        key: 'updateThresholds',
        value: function updateThresholds() {
            this.thresholdCache = {};
            this.thresholdsSorted = _lodash2.default.reverse(_lodash2.default.sortBy(this.panel.thresholds, function (t) {
                return parseFloat(t.value);
            }));
        }
    }, {
        key: '_color',
        value: function _color(value) {
            if (this.thresholdCache[value] === undefined) {
                var threshold = _lodash2.default.find(this.thresholdsSorted, function (t) {
                    return value >= parseFloat(t.value);
                });
                var returnColor = threshold ? threshold.color : this.panel.defaultColor;
                this.thresholdCache[value] = returnColor;
                return returnColor;
            }
            return this.thresholdCache[value];
        }
    }, {
        key: '_compactArchive',
        value: function _compactArchive(datapoints, range, secondsPerDot, dotCount) {

            var panelStartTimeSeconds = range.from.valueOf() / 1000;
            var compacted = Array(dotCount);
            var pointCounter = datapoints.length - 1;

            for (var i = pointCounter; i > 0; i--) {
                if (datapoints[i][0] == null) {
                    continue;
                }
                // get time of set of current datapoint
                var pointTimeOffsetSeconds = datapoints[i][1] / 1000 - panelStartTimeSeconds;

                // calculate index of window in which the datapoint falls
                var windowIndex = Math.ceil(pointTimeOffsetSeconds / secondsPerDot) - 1;

                // don't create a windowsIndex > max windows length
                windowIndex = Math.min(windowIndex, dotCount - 1);

                // add datapoint to compacted list, if there isn't already a datapoint for this window
                if (windowIndex >= 0 && compacted[windowIndex] === undefined) {
                    compacted[windowIndex] = datapoints[i];
                }
            }

            return compacted;
        }
    }], [{
        key: 'compactToBuckets',
        value: function compactToBuckets(datapoints, range, secondsPerDot, dotCount) {
            var pointCounter = datapoints.length - 1;
            var panelStartTimeSeconds = range.from.valueOf() / 1000;

            var buckets = [];
            for (var i = pointCounter; i > 0; i--) {
                //todo increase instead
                if (datapoints[i][0] == null) {
                    continue;
                }
                // get time of set of current datapoint
                var pointTimeOffsetSeconds = datapoints[i][1] / 1000 - panelStartTimeSeconds;

                // calculate index of window in which the datapoint falls
                var windowIndex = Math.ceil(pointTimeOffsetSeconds / secondsPerDot) - 1;

                // don't create a windowsIndex > max windows length
                windowIndex = Math.min(windowIndex, dotCount - 1);

                var bucket = buckets[windowIndex];
                if (bucket === undefined) {
                    bucket = [];
                }
                bucket.push(datapoints[i]);

                buckets[windowIndex] = bucket;
            }
            return buckets;
        }
    }]);

    return Builder;
}();
