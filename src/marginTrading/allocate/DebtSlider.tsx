// import { BigNumber } from 'bignumber.js';
import * as d3 from 'd3'
import { ScaleLinear } from 'd3-scale'
import { BaseType, Selection } from 'd3-selection'
import * as React from 'react'
import { createElement } from 'react-faux-dom'

import * as styles from './DebtSlider.scss'

interface SliderProps {
  min: number
  max: number
  originalValue: number
  maxAvailable: number
  currentValue: number
  change: (newValue: number) => void
  canExtendAvailable?: boolean
  canExtendMinMax?: boolean
  swapToOriginalValue?: boolean
  swapToMaxAvailable?: boolean
  swapSizePercent?: number
}

const svgProps = {
  width: 404,
  height: 18,
}

const sliderProps = {
  width: 404 - 6,
  height: 6,
  handleR: 9,
}

export class DebtSlider extends React.Component<SliderProps> {
  public render() {
    const buffer = this.calculateBuffer()
    const chart = createElement('div')

    // console.warn('debt slider props ', this.props);
    const svgMainGraphic = d3.select(chart).append('svg').attr('width', svgProps.width).attr('height', svgProps.height)

    const xScale = d3
      .scaleLinear()
      .domain([this.props.min - buffer, this.props.max + buffer])
      .range([0, sliderProps.width])

    const slider = svgMainGraphic
      .append('g')
      .attr('transform', `translate(${(svgProps.width - sliderProps.width) / 2}, ` + `${svgProps.height / 2})`)

    this.drawBackgroundLine(slider, xScale)

    const drawAvailableLineBeforeOrig = this.props.maxAvailable > this.props.originalValue
    const drawModifiedLineBeforeOrig = this.props.currentValue > this.props.originalValue

    if (drawAvailableLineBeforeOrig) {
      this.drawAvailableLine(slider, xScale)
    }
    if (drawModifiedLineBeforeOrig) {
      this.drawModifiedLine(slider, xScale)
    }

    this.drawOriginalLine(slider, xScale)

    if (!drawAvailableLineBeforeOrig) {
      this.drawAvailableLine(slider, xScale)
    }
    if (!drawModifiedLineBeforeOrig) {
      this.drawModifiedLine(slider, xScale)
    }

    this.drawHandler(slider, xScale)

    slider
      .append('line')
      .classed(styles.trackOverlay, true)
      .attr('x1', xScale.range()[0])
      .attr('x2', xScale.range()[1])
      .on('mousemove', () => {
        if (d3.event.buttons === 1) {
          // primary key
          const newValue = this.calculateNewCurrentValue(xScale, d3.event.offsetX)
          this.props.change(newValue)
        }
      })
      .on('click', () => {
        const newValue = this.calculateNewCurrentValue(xScale, d3.event.offsetX)
        this.props.change(newValue)
      })

    return <div>{chart.toReact()}</div>
  }

  private drawBackgroundLine(slider: Selection<BaseType, any, null, undefined>, xScale: ScaleLinear<number, number>) {
    slider.append('line').classed(styles.trackBg, true).attr('x1', xScale.range()[0]).attr('x2', xScale.range()[1])
  }

  private drawAvailableLine(slider: Selection<BaseType, any, null, undefined>, xScale: ScaleLinear<number, number>) {
    if (this.props.maxAvailable === undefined) {
      return
    }
    slider
      .append('line')
      .classed(styles.trackAvailable, true)
      .attr('x1', xScale(this.props.originalValue))
      .attr('x2', xScale(this.props.maxAvailable))
  }

  private drawOriginalLine(slider: Selection<BaseType, any, null, undefined>, xScale: ScaleLinear<number, number>) {
    if (this.props.originalValue >= this.props.min) {
      slider
        .append('line')
        .classed(styles.trackOriginal, true)
        .attr('x1', xScale.range()[0])
        .attr('x2', xScale(this.props.originalValue))
    }
  }

  private drawModifiedLine(slider: Selection<BaseType, any, null, undefined>, xScale: ScaleLinear<number, number>) {
    if (this.props.currentValue === undefined) {
      return
    }
    const scaledCurrentValue = xScale(this.props.currentValue)
    const scaledOriginalValue =
      this.props.originalValue === this.props.min ? xScale.range()[0] : xScale(this.props.originalValue)
    slider
      .append('line')
      .classed(styles.trackModified, true)
      .attr('x1', Math.min(scaledCurrentValue, scaledOriginalValue))
      .attr('x2', Math.max(scaledCurrentValue, scaledOriginalValue))
  }

  private drawHandler(slider: Selection<BaseType, any, null, undefined>, xScale: ScaleLinear<number, number>) {
    if (this.props.currentValue === undefined) {
      return
    }
    const xVal = xScale(this.props.currentValue)
    const xTranslate = xVal === 0 ? sliderProps.handleR : xVal
    const handler = slider
      .insert('circle')
      .classed(styles.handler, true)
      .attr('transform', `translate(${xTranslate}, 0)`)
      .attr('r', sliderProps.handleR)

    handler.data()
  }

  private calculateBuffer() {
    const range = this.props.max - this.props.min
    const viewBuffer = sliderProps.handleR - sliderProps.height / 2
    const viewRange = sliderProps.width - 2 * viewBuffer
    return (viewBuffer * range) / viewRange
  }

  private calculateNewCurrentValue(xScale: ScaleLinear<number, number>, offsetX: number): number {
    if (offsetX === undefined) {
      console.error('offsetX is undefined ')
    }
    let xValue = xScale.invert(offsetX)

    // ---------- swaps end other extras ---------------
    const swapSizePercent = this.props.swapSizePercent || 3
    const swapToOriginalValue = this.props.swapToOriginalValue || true
    const swapToMaxAvailable = this.props.swapToMaxAvailable || true
    const canExtendAvailable = this.props.canExtendAvailable || true
    const canExtendMinMax = this.props.canExtendMinMax || false
    const swapRange = ((this.props.max - this.props.min) * swapSizePercent) / 100

    const closeToOrig = Math.abs(this.props.originalValue - xValue) < swapRange
    const closeToMax = Math.abs(this.props.maxAvailable - xValue) < swapRange

    if (swapToOriginalValue && swapToMaxAvailable && closeToMax && closeToOrig) {
      xValue =
        Math.abs(this.props.originalValue - xValue) < Math.abs(this.props.maxAvailable - xValue)
          ? this.props.originalValue
          : this.props.maxAvailable
    } else if (swapToOriginalValue && closeToOrig) {
      xValue = this.props.originalValue
    } else if (swapToMaxAvailable && closeToMax) {
      xValue = this.props.maxAvailable
    }

    if (!canExtendMinMax && this.props.maxAvailable !== undefined) {
      if (xValue < this.props.min) {
        xValue = this.props.min
      } else if (xValue > this.props.max) {
        xValue = this.props.max
      }
    }

    if (!canExtendAvailable && this.props.maxAvailable !== undefined) {
      const down = Math.min(this.props.originalValue, this.props.maxAvailable)
      const up = Math.max(this.props.originalValue, this.props.maxAvailable)
      if (xValue < down) {
        xValue = down
      } else if (xValue > up) {
        xValue = up
      }
    }

    // console.log('new xValue is ', xValue, this.props);
    return xValue
  }
}
