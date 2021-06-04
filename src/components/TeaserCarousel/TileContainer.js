import React, { useContext } from 'react'

import CarouselContext from './Context'
import Grid from './Grid'
import Row from './Row'

const Container = ({
  initialScrollTileIndex,
  children,
  height,
  style,
  overflowCentered
}) => {
  const context = useContext(CarouselContext)
  if (context.grid) {
    return (
      <Grid initialScrollTileIndex={initialScrollTileIndex} height={height}>
        {children}
      </Grid>
    )
  }
  return (
    <Row
      initialScrollTileIndex={initialScrollTileIndex}
      style={style}
      overflowCentered={overflowCentered}
    >
      {children}
    </Row>
  )
}

export default Container
