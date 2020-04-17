import { storiesOf } from '@storybook/react'
// import { BigNumber } from 'bignumber.js';
import * as React from 'react'
import { DebtSlider } from './DebtSlider'

const stories = storiesOf('Margin Trading/Debt slider', module)

stories.add('DebtSlider', () => {
  const sliderProps = {
    min: 5,
    max: 150,
    originalValue: 65,
    maxAvailable: 120,
    currentValue: 45,
    change: () => null,
  }

  return (
    <div>
      <DebtSlider {...sliderProps} />
      <DebtSlider {...sliderProps} currentValue={100} />
      <DebtSlider {...sliderProps} currentValue={5} />
      <DebtSlider {...sliderProps} currentValue={150} />
      <DebtSlider {...sliderProps} maxAvailable={150} />
      <DebtSlider {...sliderProps} originalValue={5} />
      <DebtSlider {...sliderProps} originalValue={6} />
    </div>
  )
})
