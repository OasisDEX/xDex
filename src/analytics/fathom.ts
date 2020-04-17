const config = {
  key: 'XELBLZRK',
}

interface Fathom {
  (...args: any[]): void
  q?: IArguments[]
}

declare global {
  interface Window {
    fathom: Fathom
  }
}

const getFathom = (): Fathom => {
  return (window.fathom =
    // tslint:disable
    window.fathom ||
    function () {
      ;(window.fathom.q = window.fathom.q || []).push(arguments)
    })
  // tslint:enable
}

export const load = (url = '//cdn.usefathom.com/tracker.js'): void => {
  window.fathom =
    window.fathom ||
    // tslint:disable
    function () {
      ;(window.fathom.q = window.fathom.q || []).push(arguments)
    }
  // tslint:enable

  const tracker = document.createElement('script')
  const firstScript = document.getElementsByTagName('script')[0]

  tracker.async = true
  tracker.src = url
  tracker.id = 'fathom-script'
  if (firstScript.parentNode) {
    firstScript.parentNode.insertBefore(tracker, firstScript)
  }
}

export const setSiteId = (siteId: string): void => {
  const fathom = getFathom()
  fathom('set', 'siteId', siteId)
}

export const trackPageview = (): void => {
  const fathom = getFathom()
  fathom('trackPageview')
}

export const trackGoal = (id: string, cents: number) => {
  const fathom = getFathom()
  fathom('trackGoal', id, cents)
}

export function fathomInit() {
  load()
  setSiteId(config.key)
  trackPageview()
}
