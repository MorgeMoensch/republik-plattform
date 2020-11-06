import React from 'react'

const Icon = ({ size = 24, fill }) => (
  <svg width={size} height={size} viewBox='0 0 24 24'>
    <path
      fill={fill}
      d='M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.1h-15V5h15v14.1zm0-16.1h-15c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'
    />
  </svg>
)
export default Icon
