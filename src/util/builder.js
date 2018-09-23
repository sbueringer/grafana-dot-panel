import moment from 'moment';
import _ from "lodash";

export class Builder {
    constructor(panel, $element) {
        this.panel = panel;
        this.$element = $element;
        this.debug = false;

        this.updateThresholds();
    }

    prepareData(range, seriesList = []) {

        // Get panel width
        let panel = this.$element.find('ng-transclude.panel-height-helper');
        let panelWidthForDots = panel.width() - parseInt(this.panel.yAxisWidthPx) - 20; // 60 label +20 scrollbar buffer

        let dotWidth = parseInt(this.panel.widthPx) + 2 * parseInt(this.panel.marginPx);
        let dotCount = Math.floor(panelWidthForDots / dotWidth);
        let timeRangeSeconds = moment.duration(range.to.diff(range.from)).as('seconds');
        let secondsPerDot = timeRangeSeconds / dotCount;

        let dotsPerHeader = Math.max(1, parseInt(this.panel.xAxisDotRange));
        let headerCount = Math.floor(dotCount / dotsPerHeader);

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
        let columnHeaders = [];
        for (let i = 0; i < headerCount; i++) {
            // +1 because there are always the newest data points of a window shown as dot so that is more close to the data point
            let time = range.from.clone().add(secondsPerDot * (i * dotsPerHeader + 1), "seconds");
            columnHeaders.push({
                text: time.format(this.panel.xAxisDateFormat),
                color: this.panel.xAxisTextColor,
                textSize: parseInt(this.panel.xAxisTextSize),
            })
        }

        // sort series by target
        seriesList.sort((seriesA, seriesB) => {
            return seriesA.target < seriesB.target ? -1 : 1
        });

        // update thresholds
        this.updateThresholds();

        // create row headers and rows
        let rowHeaders = [];
        let dotsSeries = [];

        seriesList.forEach((series) => {
            let pointSeries = this._compact(series.datapoints, range, secondsPerDot, dotCount);

            let dotSeries = [];
            for (let i = 0; i < dotCount; i++) {
                if (pointSeries[i] === undefined) {
                    dotSeries.push({
                        name: series.target,
                        displayValue: "No Data",
                        timestamp: 0,
                        color: this.panel.defaultColor,
                    });
                } else {
                    let point = pointSeries[i];
                    dotSeries.push({
                        name: series.target,
                        displayValue: point[0],
                        timestamp: point[1],
                        color: this._color(point[0]),
                    });
                }

            }
            rowHeaders.push({
                text: series.target,
                color: this.panel.yAxisTextColor,
                textSize: parseInt(this.panel.yAxisTextSize),
            });

            dotsSeries.push({dots: dotSeries})
        });

        return {columnHeaders: columnHeaders, rowHeaders: rowHeaders, dotsSeries: dotsSeries}
    }

    _compact(datapoints, range, secondsPerDot, dotCount) {

        let startTime = new Date();

        let compacted = [];
        let buckets = Builder.compactToBuckets(datapoints, range, secondsPerDot, dotCount);
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

        console.log(`onRender compact End: ${new Date() - startTime} ms`);
        return compacted
    }

    static compactToBuckets(datapoints, range, secondsPerDot, dotCount) {
        let pointCounter = datapoints.length - 1;
        let panelStartTimeSeconds = range.from.valueOf() / 1000;

        let buckets = [];
        for (let i = pointCounter; i > 0; i--) { //todo increase instead
            if (datapoints[i][0] == null) {
                continue;
            }
            // get time of set of current datapoint
            let pointTimeOffsetSeconds = ((datapoints[i][1] / 1000) - panelStartTimeSeconds);

            // calculate index of window in which the datapoint falls
            let windowIndex = Math.ceil(pointTimeOffsetSeconds / secondsPerDot) - 1;

            // don't create a windowsIndex > max windows length
            windowIndex = Math.min(windowIndex, dotCount - 1);

            let bucket = buckets[windowIndex];
            if (bucket === undefined){
                bucket = []
            }
            bucket.push(datapoints[i]);

            buckets[windowIndex] = bucket;
        }
        return buckets
    }

    getCompactedBucketsLast(buckets) {
        let compacted = [];
        _.forEach(buckets, bucket => {
            let point = _.maxBy(bucket, point => point[1]);
            compacted.push(point)
        });
        return compacted;
    }

    getCompactedBucketsFirst(buckets) {
        let compacted = [];
        _.forEach(buckets, bucket => {
            let point = _.minBy(bucket, point => point[1]);
            compacted.push(point)
        });
        return compacted;
    }

    getCompactedBucketsMax(buckets) {
        let compacted = [];
        _.forEach(buckets, bucket => {
            let point = _.maxBy(bucket, point => point[0]);
            compacted.push(point)
        });
        return compacted;
    }

    getCompactedBucketsMin(buckets) {
        let compacted = [];
        _.forEach(buckets, bucket => {
            let point = _.minBy(bucket, point => point[0]);
            compacted.push(point)
        });
        return compacted;
    }

    getCompactedBucketsAverage(buckets) {
        let compacted = [];
        _.forEach(buckets, bucket => {
            let point0 = _.meanBy(bucket, point => point[0]);
            let point1 = _.meanBy(bucket, point => point[1]);
            compacted.push([point0, point1])
        });
        return compacted;
    }

    updateThresholds() {
        this.thresholdCache = {};
        this.thresholdsSorted = _.reverse(_.sortBy(this.panel.thresholds, t => parseFloat(t.value)));
    }

    _color(value) {
        if (this.thresholdCache[value] === undefined) {
            let threshold = _.find(this.thresholdsSorted, t => value >= parseFloat(t.value));
            let returnColor = threshold ? threshold.color : this.panel.defaultColor;
            this.thresholdCache[value] = returnColor;
            return returnColor
        }
        return this.thresholdCache[value]
    }

    _compactArchive(datapoints, range, secondsPerDot, dotCount) {

        let panelStartTimeSeconds = range.from.valueOf() / 1000;
        let compacted = Array(dotCount);
        let pointCounter = datapoints.length - 1;

        for (let i = pointCounter; i > 0; i--) {
            if (datapoints[i][0] == null) {
                continue;
            }
            // get time of set of current datapoint
            let pointTimeOffsetSeconds = ((datapoints[i][1] / 1000) - panelStartTimeSeconds);

            // calculate index of window in which the datapoint falls
            let windowIndex = Math.ceil(pointTimeOffsetSeconds / secondsPerDot) - 1;

            // don't create a windowsIndex > max windows length
            windowIndex = Math.min(windowIndex, dotCount - 1);

            // add datapoint to compacted list, if there isn't already a datapoint for this window
            if (windowIndex >= 0 && compacted[windowIndex] === undefined) {
                compacted[windowIndex] = datapoints[i];
            }

        }

        return compacted
    }
}

