'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PanelCtrl = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _kbn = require('app/core/utils/kbn');

var _kbn2 = _interopRequireDefault(_kbn);

var _sdk = require('app/plugins/sdk');

var _builder = require('./util/builder');

var _d = require('d3');

var d3 = _interopRequireWildcard(_d);

require('./css/module.css!');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var panelDefaults = {
    // dots
    widthPx: 15,
    heightPx: 15,
    marginPx: 1,
    borderRadiusPx: 1,
    compactionAlgorithm: "Last",

    // dot Colors
    defaultColor: 'rgb(117, 117, 117)',
    thresholds: [],

    format: 'none',

    // xAxis
    xAxisTextColor: "#d8d9da",
    xAxisTextSize: 15,
    xAxisDotRange: 12,
    xAxisDateFormat: "MM-DD HH:mm:ss",

    // yAxis
    yAxisTextColor: "#d8d9da",
    yAxisTextSize: 15,
    yAxisWidthPx: 70
};

var PanelCtrl = exports.PanelCtrl = function (_MetricsPanelCtrl) {
    _inherits(PanelCtrl, _MetricsPanelCtrl);

    function PanelCtrl($scope, $injector, $element) {
        _classCallCheck(this, PanelCtrl);

        var _this = _possibleConstructorReturn(this, (PanelCtrl.__proto__ || Object.getPrototypeOf(PanelCtrl)).call(this, $scope, $injector));

        _lodash2.default.defaults(_this.panel, panelDefaults);

        _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
        _this.events.on('data-received', _this.onDataReceived.bind(_this));
        _this.events.on('render', _this.onRender.bind(_this));

        _this.$element = $element;
        _this.tooltip = {};

        _this.builder = new _builder.Builder(_this.panel, _this.$element);
        return _this;
    }

    _createClass(PanelCtrl, [{
        key: 'onInitEditMode',
        value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/sbueringer-dot-panel/partials/editor.html');
            this.unitFormats = _kbn2.default.getUnitFormats();
            this.dateFormats = [{ text: 'MM-DD HH:mm:ss', value: 'MM-DD HH:mm:ss' }, { text: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' }, { text: 'YYYY-MM-DD HH:mm:ss.SSS', value: 'YYYY-MM-DD HH:mm:ss.SSS' }, { text: 'MM/DD/YY h:mm:ss a', value: 'MM/DD/YY h:mm:ss a' }, { text: 'MMMM D, YYYY LT', value: 'MMMM D, YYYY LT' }];
            this.compactionAlgorithms = [{ text: 'Last', value: 'Last' }, { text: 'First', value: 'First' }, { text: 'Min', value: 'Min' }, { text: 'Max', value: 'Max' }, { text: 'Average', value: 'Average' }];
        }
    }, {
        key: 'onDataReceived',
        value: function onDataReceived(seriesList) {
            this.seriesList = seriesList;
            this.render();
        }
    }, {
        key: 'onRender',
        value: function onRender() {
            if (typeof this.range !== 'undefined' && typeof this.range.to !== 'undefined' && typeof this.range.from !== 'undefined') {
                console.log('onRender Start');
                var startTime = new Date();

                this.data = this.builder.prepareData(this.range, this.seriesList);

                console.log('onRender prepareData End: ' + (new Date() - startTime) + ' ms');

                this.renderPanel();

                console.log('onRender renderPanel End: ' + (new Date() - startTime) + ' ms');
            }
        }
    }, {
        key: 'renderPanel',
        value: function renderPanel() {
            var _this2 = this;

            var panel = this.$element.find('ng-transclude.panel-height-helper');
            panel.css('overflow', "auto");
            var panelWidthForDots = panel.width() - 20; // 20 scrollbar buffer
            this.$dotPanel = this.$element.find('.dot-panel');
            var dotPanelElement = this.$dotPanel[0];

            if (this.dotPanel) {
                this.dotPanel.remove();
            }

            var columnHeaderHeight = parseInt(this.panel.xAxisTextSize) + 5;
            var rowHeaderWidth = parseInt(this.panel.yAxisWidthPx);
            var footerHeight = 5;
            var dotHeight = parseInt(this.panel.heightPx);
            var dotWidth = parseInt(this.panel.widthPx);
            var borderRadiusPx = parseInt(this.panel.borderRadiusPx);

            var columnHeader = this.convertToColumnHeader(this.data.columnHeaders, rowHeaderWidth, columnHeaderHeight, dotWidth);
            var rowHeader = this.convertToRowHeader(this.data.rowHeaders, dotHeight, columnHeaderHeight);
            var header = columnHeader.concat(rowHeader);

            var dots = this.convertToDots(this.data.dotsSeries, dotHeight, dotWidth, columnHeaderHeight, rowHeaderWidth);

            var panelHeight = columnHeaderHeight + footerHeight + rowHeader.length * (dotHeight + 2 * parseInt(this.panel.marginPx));

            this.dotPanel = d3.select(dotPanelElement).append('svg').attr('width', panelWidthForDots).attr('height', panelHeight);

            this.dotPanel.selectAll("text").data(header).enter().append("text").attr("x", function (d) {
                return d.x;
            }).attr("y", function (d) {
                return d.y;
            }).attr("fill", function (d) {
                return d.color;
            }).text(function (d) {
                return d.text;
            }).attr("font-size", function (d) {
                return d.textSize;
            }).attr("class", "dotpanel-text");

            this.dotPanel.selectAll("rect").data(dots).enter().append("rect").attr("x", function (d) {
                return d.x;
            }).attr("y", function (d) {
                return d.y;
            }).attr("rx", borderRadiusPx).attr("ry", borderRadiusPx).attr("width", function (d) {
                return d.width;
            }).attr("height", function (d) {
                return d.height;
            }).attr("style", function (d) {
                return 'fill: ' + d.color;
            }).attr("class", "dotpanel-dot");

            this.$dotPanel.find('.dotpanel-dot').on('mouseenter', function (event) {
                _this2.highlightDot(event);
                _this2.showTooltip(event);
            }).on('mouseleave', function (event) {
                _this2.resetDotHighLight(event);
                _this2.hideTooltip();
            });
        }
    }, {
        key: 'convertToColumnHeader',
        value: function convertToColumnHeader(headerSeries, rowHeaderWidth, columnHeaderHeight, dotWidth) {
            var dots = [];
            var x = 0;
            var margin = parseInt(this.panel.marginPx);
            var dotsPerHeader = Math.max(1, parseInt(this.panel.xAxisDotRange));
            var effectiveDotWidth = dotWidth + 2 * margin;
            var headerWidth = Math.floor(dotsPerHeader * effectiveDotWidth);
            _lodash2.default.forEach(headerSeries, function (header) {
                dots.push({
                    x: rowHeaderWidth + margin + x * headerWidth,
                    y: columnHeaderHeight - 5,
                    text: header.text,
                    textSize: header.textSize,
                    color: header.color
                });
                x++;
            });
            return dots;
        }
    }, {
        key: 'convertToRowHeader',
        value: function convertToRowHeader(headerSeries, rowHeaderHeight, columnHeaderHeight) {
            var dots = [];
            var y = 0;
            var margin = parseInt(this.panel.marginPx);
            var textSize = parseInt(this.panel.yAxisTextSize);
            _lodash2.default.forEach(headerSeries, function (header) {
                dots.push({
                    x: 0,
                    y: columnHeaderHeight + rowHeaderHeight / 2 + textSize / 2 + margin + y * (rowHeaderHeight + 2 * margin),
                    text: header.text,
                    textSize: header.textSize,
                    color: header.color
                });
                y++;
            });
            return dots;
        }
    }, {
        key: 'convertToDots',
        value: function convertToDots(dotsSeries, dotHeight, dotWidth, columnHeaderHeight, rowHeaderWidth) {
            var dots = [];
            var y = 0;
            var margin = parseInt(this.panel.marginPx);
            _lodash2.default.forEach(dotsSeries, function (dotSeries) {
                var x = 0;
                _lodash2.default.forEach(dotSeries.dots, function (dot) {
                    dots.push({
                        x: rowHeaderWidth + margin + x * (dotWidth + 2 * margin),
                        y: columnHeaderHeight + margin + y * (dotHeight + 2 * margin),
                        width: dotWidth,
                        height: dotHeight,
                        name: dot.name,
                        displayValue: dot.displayValue,
                        timestamp: dot.timestamp,
                        color: dot.color
                    });
                    x++;
                });
                y++;
            });
            return dots;
        }
    }, {
        key: 'showTooltip',
        value: function showTooltip(event) {
            if (this.tooltip.panel) {
                this.tooltip.panel.remove();
            }

            var data = d3.select(event.target).data()[0];
            this.tooltip.panel = d3.select('body').append('div').attr('class', 'heatmap-tooltip graph-tooltip grafana-tooltip');

            this.tooltip.panel.html(data.name + ': ' + (0, _moment2.default)(data.timestamp).format() + ' => ' + data.displayValue);
            this.tooltip.panel.style('left', event.clientX + 'px').style('top', event.clientY + 'px');
        }
    }, {
        key: 'hideTooltip',
        value: function hideTooltip() {
            if (this.tooltip.panel) {
                this.tooltip.panel.remove();
            }
            this.tooltip.panel = null;
        }
    }, {
        key: 'highlightDot',
        value: function highlightDot(event) {
            var color = d3.select(event.target).style('fill');
            var highlightColor = d3.color(color).brighter(2);
            var strokeColor = d3.color(color).brighter(4);
            var current_card = d3.select(event.target);
            this.tooltip.originalFillColor = color;
            current_card.style('fill', highlightColor.toString()).style('stroke', strokeColor.toString()).style('stroke-width', 1);
        }
    }, {
        key: 'resetDotHighLight',
        value: function resetDotHighLight(event) {
            d3.select(event.target).style('fill', this.tooltip.originalFillColor).style('stroke', this.tooltip.originalFillColor).style('stroke-width', 0);
        }
    }, {
        key: 'onEditorSetFormat',
        value: function onEditorSetFormat(subitem) {
            this.panel.format = subitem.value;
            this.render();
        }
    }, {
        key: 'onEditorAddThreshold',
        value: function onEditorAddThreshold() {
            this.panel.thresholds.push({ color: this.panel.defaultColor });
            this.builder.updateThresholds();
            this.render();
        }
    }, {
        key: 'onEditorRemoveThreshold',
        value: function onEditorRemoveThreshold(index) {
            this.panel.thresholds.splice(index, 1);
            this.builder.updateThresholds();
            this.render();
        }
    }]);

    return PanelCtrl;
}(_sdk.MetricsPanelCtrl);

PanelCtrl.templateUrl = 'partials/module.html';
