import React, { Fragment, useState } from 'react'
import { css } from 'glamor'
import { compose } from 'react-apollo'
import { withRouter } from 'next/router'
import { Logo, colors, mediaQueries, ColorContext } from '@project-r/styleguide'

import { Router, matchPath } from '../../lib/routes'
import { withMembership } from '../Auth/checkRoles'
import withT from '../../lib/withT'
import withInNativeApp, { postMessage } from '../../lib/withInNativeApp'
import { shouldIgnoreClick } from '../Link/utils'
import NotificationIconNew from '../Notifications/NotificationIconNew'
import BackIcon from '../Icons/Back'

import UserNew from './UserNew'
import Popover from './Popover'
import NavPopover from './Popover/NavNew'
import UserNavPopover from './Popover/UserNav'
import LoadingBar from './LoadingBar'
import Pullable from './Pullable'
import HLine from './HLine'
import ToggleNew from './ToggleNew'

import {
  HEADER_HEIGHT,
  HEADER_HEIGHT_MOBILE,
  SUBHEADER_HEIGHT,
  SUBHEADER_HEIGHT_MOBILE,
  ZINDEX_HEADER,
  LOGO_WIDTH,
  LOGO_PADDING,
  LOGO_WIDTH_MOBILE,
  LOGO_PADDING_MOBILE
} from '../constants'

// Workaround for WKWebView fixed 0 rendering hickup
// - iOS 11.4: header is transparent and only appears after triggering a render by scrolling down enough
const forceRefRedraw = ref => {
  if (ref) {
    const redraw = () => {
      const display = ref.style.display
      // offsetHeight
      ref.style.display = 'none'
      /* eslint-disable-next-line no-unused-expressions */
      ref.offsetHeight // this force webkit to flush styles (render them)
      ref.style.display = display
    }
    const msPerFrame = 1000 / 30 // assuming 30 fps
    const frames = [1, 10, 20, 30]
    // force a redraw on frame x after initial dom mount
    frames.forEach(frame => {
      setTimeout(redraw, msPerFrame * frame)
    })
  }
}

const isActiveRoute = (active, route, params = {}) =>
  !!active &&
  active.route === route &&
  Object.keys(params).every(key => active.params[key] === params[key])

const isFront = router => {
  const active = matchPath(router.asPath)
  return isActiveRoute(active, 'index', {})
}

let routeChangeStarted

const HeaderNew = ({
  inNativeApp,
  inNativeIOSApp,
  isMember,
  dark,
  me,
  t,
  secondaryNav,
  showSecondary,
  router,
  formatColor,
  pullable = true
}) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedNav, setExpandedNav] = useState(null)

  const textFill = dark ? colors.negative.text : colors.text
  const logoFill = dark ? colors.logoDark || '#fff' : colors.logo || '#000'
  const backButton = inNativeIOSApp && me && !isFront(router)

  const toggleExpanded = target => {
    if (target.id === expandedNav) {
      setExpanded(false)
      setExpandedNav(null)
    } else if (expanded) {
      setExpandedNav(target.id)
    } else {
      setExpanded(!expanded)
      setExpandedNav(target.id)
    }
  }

  const closeHandler = () => {
    if (expanded) {
      setExpanded(false)
      setExpandedNav(null)
    }
  }

  const goTo = (pathName, route) => e => {
    if (shouldIgnoreClick(e)) {
      return
    }
    e.preventDefault()
    if (router.pathname === pathName) {
      window.scrollTo(0, 0)
      closeHandler()
    } else {
      Router.pushRoute(route).then(() => window.scrollTo(0, 0))
    }
  }

  return (
    <ColorContext.Provider value={dark && !expanded ? colors.negative : colors}>
      <div
        {...styles.navBar}
        style={{ backgroundColor: dark ? colors.negative.primaryBg : '#fff' }}
        ref={inNativeIOSApp ? forceRefRedraw : undefined}
      >
        <div {...styles.navBarItem}>
          <div {...styles.leftBarItem}>
            {backButton && (
              <a
                {...styles.back}
                style={{
                  opacity: 1,
                  pointerEvents: backButton ? undefined : 'none',
                  href: '#back'
                }}
                title={t('header/back')}
                onClick={e => {
                  e.preventDefault()
                  if (backButton) {
                    routeChangeStarted = false
                    window.history.back()
                    setTimeout(() => {
                      if (!routeChangeStarted) {
                        Router.replaceRoute('index').then(() =>
                          window.scrollTo(0, 0)
                        )
                      }
                    }, 200)
                  }
                }}
              >
                <BackIcon size={24} fill={textFill} />
              </a>
            )}
            <UserNew
              dark={dark}
              me={me}
              backButton={backButton}
              id='user'
              title={t(
                `header/nav/${expandedNav === 'user' ? 'close' : 'open'}/aria`
              )}
              onClick={e => toggleExpanded(e.currentTarget)}
            />
            {me && <NotificationIconNew fill={textFill} />}
          </div>
        </div>
        <div {...styles.navBarItem}>
          <a
            {...styles.logo}
            aria-label={t('header/logo/magazine/aria')}
            href={'/'}
            onClick={goTo('/', 'index')}
          >
            <Logo fill={logoFill} />
          </a>
        </div>
        <div {...styles.navBarItem}>
          <div {...styles.rightBarItem}>
            <ToggleNew
              expanded={expandedNav === 'main'}
              dark={dark}
              size={26}
              id='main'
              title={t(
                `header/nav/${expandedNav === 'main' ? 'close' : 'open'}/aria`
              )}
              onClick={e => toggleExpanded(e.currentTarget)}
            />
          </div>
        </div>
      </div>
      <HLine formatColor={formatColor} dark={dark} />
      <div>
        {secondaryNav && (
          <div
            {...styles.secondaryNav}
            style={{
              backgroundColor: dark ? colors.negative.primaryBg : '#fff'
            }}
          >
            {showSecondary && secondaryNav}
          </div>
        )}
      </div>
      <div
        {...styles.popoverBackground}
        style={{
          visibility: expandedNav !== null ? 'visible' : 'hidden',
          opacity: expandedNav !== null ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out, visibility 0s linear 0.2s'
        }}
      />
      <Popover expanded={expandedNav === 'main'}>
        <NavPopover
          me={me}
          router={router}
          expanded={expandedNav === 'main'}
          closeHandler={closeHandler}
        />
      </Popover>
      <Popover expanded={expandedNav === 'user'}>
        <UserNavPopover
          me={me}
          router={router}
          expanded={expandedNav === 'user'}
          closeHandler={closeHandler}
        />
      </Popover>
      <LoadingBar
        onRouteChangeStart={() => {
          routeChangeStarted = true
        }}
      />
      {inNativeApp && pullable && (
        <Pullable
          dark={dark}
          onRefresh={() => {
            if (inNativeIOSApp) {
              postMessage({ type: 'haptic', payload: { type: 'impact' } })
            }
            // give the browser 3 frames (1000/30fps) to start animating the spinner
            setTimeout(() => {
              window.location.reload(true)
            }, 33 * 3)
          }}
        />
      )}
    </ColorContext.Provider>
  )
}

export default compose(
  withT,
  withMembership,
  withRouter,
  withInNativeApp
)(HeaderNew)

const styles = {
  navBar: css({
    height: HEADER_HEIGHT_MOBILE,
    zIndex: ZINDEX_HEADER,
    display: 'flex',
    justifyContent: 'space-between',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    [mediaQueries.mUp]: {
      height: HEADER_HEIGHT
    },
    '@media print': {
      position: 'absolute'
    }
  }),
  navBarItem: css({
    flex: 1,
    display: 'flex',
    justifyContent: 'center'
  }),
  leftBarItem: css({
    marginRight: 'auto',
    display: 'flex'
  }),
  rightBarItem: css({
    marginLeft: 'auto',
    height: HEADER_HEIGHT_MOBILE - 2,
    width: HEADER_HEIGHT_MOBILE - 2 + 1,
    [mediaQueries.mUp]: {
      height: HEADER_HEIGHT - 2,
      width: HEADER_HEIGHT - 2 + 5
    },
    '@media print': {
      display: 'none'
    }
  }),
  back: css({
    display: 'block',
    padding: '10px 0px 10px 10px',
    [mediaQueries.mUp]: {
      top: -1 + 8
    }
  }),
  logo: css({
    display: 'block',
    padding: LOGO_PADDING_MOBILE,
    width: LOGO_WIDTH_MOBILE + LOGO_PADDING_MOBILE * 2,
    verticalAlign: 'middle',
    [mediaQueries.mUp]: {
      padding: LOGO_PADDING,
      width: LOGO_WIDTH + LOGO_PADDING * 2
    }
  }),
  secondaryNav: css({
    position: 'fixed',
    zIndex: ZINDEX_HEADER,
    top: HEADER_HEIGHT_MOBILE,
    left: 0,
    right: 0,
    height: SUBHEADER_HEIGHT_MOBILE,
    [mediaQueries.mUp]: {
      top: HEADER_HEIGHT,
      height: SUBHEADER_HEIGHT
    }
  }),
  popoverBackground: css({
    position: 'fixed',
    zIndex: 2,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    minHeight: '100%'
  })
}
