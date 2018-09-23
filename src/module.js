import moment from 'moment';
import _ from 'lodash'
import kbn from 'app/core/utils/kbn'
import {MetricsPanelCtrl} from 'app/plugins/sdk'
import {Builder} from './util/builder'
import * as d3 from 'd3';
import './css/module.css!'

const panelDefaults = {
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
    yAxisWidthPx: 70,
};

export class PanelCtrl extends MetricsPanelCtrl {

    constructor($scope, $injector, $element) {
        super($scope, $injector);
        _.defaults(this.panel, panelDefaults);

        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('render', this.onRender.bind(this));

        this.$element = $element;
        this.tooltip = {};

        this.builder = new Builder(this.panel, this.$element);
    }

    onInitEditMode() {
        this.addEditorTab('Options', 'public/plugins/sbueringer-dot-panel/partials/editor.html');
        this.unitFormats = kbn.getUnitFormats();
        this.dateFormats = [
            { text: 'MM-DD HH:mm:ss', value: 'MM-DD HH:mm:ss' },
            { text: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
            { text: 'YYYY-MM-DD HH:mm:ss.SSS', value: 'YYYY-MM-DD HH:mm:ss.SSS' },
            { text: 'MM/DD/YY h:mm:ss a', value: 'MM/DD/YY h:mm:ss a' },
            { text: 'MMMM D, YYYY LT', value: 'MMMM D, YYYY LT' },
        ];
        this.compactionAlgorithms = [
            { text: 'Last', value: 'Last' },
            { text: 'First', value: 'First' },
            { text: 'Min', value: 'Min' },
            { text: 'Max', value: 'Max' },
            { text: 'Average', value: 'Average' },
        ];
    }

    onDataReceived(seriesList) {
        this.seriesList = seriesList;
        this.render()
    }

    onRender() {
        if (typeof this.range !== 'undefined' && typeof this.range.to !== 'undefined' && typeof this.range.from !== 'undefined') {
            console.log(`onRender Start`);
            let startTime = new Date();

            this.data = this.builder.prepareData(this.range, this.seriesList);

            console.log(`onRender prepareData End: ${new Date() - startTime} ms`);

            this.renderPanel();

            console.log(`onRender renderPanel End: ${new Date() - startTime} ms`)
        }
    }

    renderPanel() {
        let panel = this.$element.find('ng-transclude.panel-height-helper');
        panel.css('overflow', "auto");
        let panelWidthForDots = panel.width() - 20; // 20 scrollbar buffer
        this.$dotPanel = this.$element.find('.dot-panel');
        const dotPanelElement = this.$dotPanel[0];

        if (this.dotPanel) {
            this.dotPanel.remove();
        }

        let columnHeaderHeight = parseInt(this.panel.xAxisTextSize) + 5;
        let rowHeaderWidth = parseInt(this.panel.yAxisWidthPx);
        let footerHeight = 5;
        let dotHeight = parseInt(this.panel.heightPx);
        let dotWidth = parseInt(this.panel.widthPx);
        let borderRadiusPx = parseInt(this.panel.borderRadiusPx);

        let columnHeader = this.convertToColumnHeader(this.data.columnHeaders, rowHeaderWidth, columnHeaderHeight, dotWidth);
        let rowHeader = this.convertToRowHeader(this.data.rowHeaders, dotHeight, columnHeaderHeight);
        let header = columnHeader.concat(rowHeader);

        let dots = this.convertToDots(this.data.dotsSeries, dotHeight, dotWidth, columnHeaderHeight, rowHeaderWidth);

        let panelHeight = columnHeaderHeight + footerHeight + rowHeader.length * (dotHeight + 2 * parseInt(this.panel.marginPx));

        this.dotPanel = d3
            .select(dotPanelElement)
            .append('svg')
            .attr('width', panelWidthForDots)
            .attr('height', panelHeight);

        this.dotPanel.selectAll("text")
            .data(header)
            .enter().append("text")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("fill", d => d.color)
            .text(d => d.text)
            .attr("font-size", d => d.textSize)
            .attr("class", "dotpanel-text");

        this.dotPanel.selectAll("rect")
            .data(dots)
            .enter().append("rect")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("rx", borderRadiusPx)
            .attr("ry", borderRadiusPx)
            .attr("width", d => d.width)
            .attr("height", d => d.height)
            .attr("style", d => `fill: ${d.color}`)
            .attr("class", "dotpanel-dot");

        this.$dotPanel.find('.dotpanel-dot')
            .on('mouseenter', event => {
                this.highlightDot(event);
                this.showTooltip(event);
            })
            .on('mouseleave', event => {
                this.resetDotHighLight(event);
                this.hideTooltip();
            });
    }

    convertToColumnHeader(headerSeries, rowHeaderWidth, columnHeaderHeight, dotWidth) {
        const dots = [];
        let x = 0;
        let margin = parseInt(this.panel.marginPx);
        let dotsPerHeader = Math.max(1, parseInt(this.panel.xAxisDotRange));
        let effectiveDotWidth = dotWidth + 2 * margin;
        let headerWidth = Math.floor(dotsPerHeader * effectiveDotWidth);
        _.forEach(headerSeries, header => {
            dots.push({
                x: rowHeaderWidth + margin + x * headerWidth,
                y: columnHeaderHeight - 5,
                text: header.text,
                textSize: header.textSize,
                color: header.color,
            });
            x++;
        });
        return dots
    }

    convertToRowHeader(headerSeries, rowHeaderHeight, columnHeaderHeight) {
        const dots = [];
        let y = 0;
        let margin = parseInt(this.panel.marginPx);
        let textSize = parseInt(this.panel.yAxisTextSize);
        _.forEach(headerSeries, header => {
            dots.push({
                x: 0,
                y: columnHeaderHeight + (rowHeaderHeight / 2) + (textSize / 2) + margin + (y * (rowHeaderHeight + 2 * margin)),
                text: header.text,
                textSize: header.textSize,
                color: header.color,
            });
            y++;
        });
        return dots
    }

    convertToDots(dotsSeries, dotHeight, dotWidth, columnHeaderHeight, rowHeaderWidth) {
        const dots = [];
        let y = 0;
        let margin = parseInt(this.panel.marginPx);
        _.forEach(dotsSeries, dotSeries => {
            let x = 0;
            _.forEach(dotSeries.dots, dot => {
                dots.push({
                    x: rowHeaderWidth + margin + (x * (dotWidth + 2 * margin)),
                    y: columnHeaderHeight + margin + (y * (dotHeight + 2 * margin)),
                    width: dotWidth,
                    height: dotHeight,
                    name: dot.name,
                    displayValue: dot.displayValue,
                    timestamp: dot.timestamp,
                    color: dot.color,
                });
                x++;
            });
            y++;
        });
        return dots
    }

    showTooltip(event) {
        if (this.tooltip.panel) {
            this.tooltip.panel.remove()
        }

        const data = d3.select(event.target).data()[0];
        this.tooltip.panel = d3
            .select('body')
            .append('div')
            .attr('class', 'heatmap-tooltip graph-tooltip grafana-tooltip');

        this.tooltip.panel.html(`${data.name}: ${moment(data.timestamp).format()} => ${data.displayValue}`);
        this.tooltip.panel.style('left', event.clientX + 'px').style('top', event.clientY + 'px');
    }

    hideTooltip() {
        if (this.tooltip.panel) {
            this.tooltip.panel.remove()
        }
        this.tooltip.panel = null;
    }

    highlightDot(event) {
        const color = d3.select(event.target).style('fill');
        const highlightColor = d3.color(color).brighter(2);
        const strokeColor = d3.color(color).brighter(4);
        const current_card = d3.select(event.target);
        this.tooltip.originalFillColor = color;
        current_card
            .style('fill', highlightColor.toString())
            .style('stroke', strokeColor.toString())
            .style('stroke-width', 1);
    }

    resetDotHighLight(event) {
        d3
            .select(event.target)
            .style('fill', this.tooltip.originalFillColor)
            .style('stroke', this.tooltip.originalFillColor)
            .style('stroke-width', 0);
    }

    onEditorSetFormat(subitem) {
        this.panel.format = subitem.value;
        this.render()
    }

    onEditorAddThreshold() {
        this.panel.thresholds.push({color: this.panel.defaultColor});
        this.builder.updateThresholds();
        this.render()
    }

    onEditorRemoveThreshold(index) {
        this.panel.thresholds.splice(index, 1);
        this.builder.updateThresholds();
        this.render()
    }
}

PanelCtrl.templateUrl = 'partials/module.html';
