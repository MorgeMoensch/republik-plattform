import React from 'react'
import PropTypes from 'prop-types'

let getHtml
if (!process.browser) {
  const ReactDOMServer = require('react-dom/server')
  const cache = require('lru-cache')({
    max: 1000 * 1000 * 200, // 200mb
    length: d => d.length
  })

  getHtml = (key, children) => {
    if (cache.has(key)) {
      return cache.get(key)
    }
    const html = ReactDOMServer.renderToStaticMarkup(children())
    cache.set(key, html)
    return html
  }
}

const SSRCachingBoundary = ({cacheKey, children}) => getHtml
  ? <div dangerouslySetInnerHTML={{
    __html: getHtml(cacheKey, children)
  }} />
  : <div>{children()}</div>

SSRCachingBoundary.propTypes = {
  cacheKey: PropTypes.string.isRequired,
  children: PropTypes.func.isRequired
}

export default SSRCachingBoundary
