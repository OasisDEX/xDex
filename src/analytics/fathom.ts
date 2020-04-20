const env = process.env.NODE_ENV === 'production' ? 'prod' : 'test'

const config = {
  test: {
    key: 'QODYHBGU',
  },
  prod: {
    key: 'TEKLVTPG',
  },
}[env]

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

export const fathomGoals = {
  test: {
    connectWallet: 'MWWRS4XV',
    depositCollateral: 'YYVGFEDO',
    depositDai: 'QQGIWR0R',
    withdrawCollateral: 'NJG1JWOJ',
    withdrawDai: 'IC8TSNAA',
    leverageBuy: '3TGKODAK',
    leverageSell: '0PSP0BEL',
    cancelOffer: 'TCMOKFV5',
    marketBuy: {
      WETHDAI: 'EP8EB5IX',
      REPDAI: 'NZI6DN4I',
      ZRXDAI: 'SGXPBBEU',
      BATDAI: 'Z6TYELX5',
      LINKDAI: 'TGR9ABBU',
      WBTCDAI: 'XPXDHDBJ',
      DAIUSDC: 'HFLJD7XH',
      DAITUSD: 'FGPYV2AC',
      DAIPAX: 'VNRUHEL6',
      REPWETH: 'TRCGUYST',
      ZRXWETH: 'RKS64IXO',
      BATWETH: 'DSSUJPLW',
      LINKWETH: 'KQXQ7DPY',
      WBTCWETH: 'EJR4WZFF',
    },
    marketSell: {
      WETHDAI: 'EWFUMI1E',
      REPDAI: '6HBPQX8M',
      ZRXDAI: 'L2BIQQIL',
      BATDAI: '7HKJVSXF',
      LINKDAI: 'WEDBEJQO',
      WBTCDAI: 'RGVJWDSJ',
      DAIUSDC: 'TBT2H7WI',
      DAITUSD: 'SHX7YKUN',
      DAIPAX: 'OU0KKKZA',
      REPWETH: 'OF8CWU0Y',
      ZRXWETH: 'WPVKI5ZJ',
      BATWETH: '7KNW1HF6',
      LINKWETH: '94HASOLN',
      WBTCWETH: 'YOZSQ1QN',
    },
    instantBuy: {
      ETHDAI: '1IDGS1XS',
      WETHDAI: 'ZPM2YYBN',
      REPDAI: '7H1FJHMZ',
      ZRXDAI: 'BP4MUZ7H',
      BATDAI: '5XNY1UTE',
      LINKDAI: '0THO4OI7',
      WBTCDAI: 'Q5C0RPQW',
      DAIUSDC: 'A9KPETQ9',
      DAITUSD: '6MQ8FHFT',
      DAIPAX: 'PDNZEEUQ',
      REPWETH: '40QXDZFR',
      ZRXWETH: 'DFCVDI5C',
      BATWETH: 'YDTF7T24',
      LINKWETH: 'MXNJKCI2',
      WBTCWETH: 'IWU2DFRV',
    },
    instantSell: {
      ETHDAI: '2KTVFLE0',
      WETHDAI: '48IFYLK5',
      REPDAI: 'YZ6RQGJO',
      ZRXDAI: 'LFZ2OH1Q',
      BATDAI: '7GYPYCUX',
      LINKDAI: 'GAOOPR3H',
      WBTCDAI: 'VV8LOEDW',
      DAIUSDC: 'KA9EOYVU',
      DAITUSD: 'XHDKBFJX',
      DAIPAX: 'NVAMLWAQ',
      REPWETH: 'KQG6PXVP',
      ZRXWETH: 'QFPAH0YW',
      BATWETH: 'FD6CT7C8',
      LINKWETH: 'L31ZDL3O',
      WBTCWETH: 'JGIYQWCW',
    },
  },
  prod: {
    connectWallet: 'ZG0VNJP1',
    depositCollateral: 'GE5RQTRV',
    depositDai: 'ZD54GJG1',
    withdrawCollateral: 'UXWVPG9Z',
    withdrawDai: 'SWTMAAQR',
    leverageBuy: 'BVXABG0M',
    leverageSell: 'RXR1CBEW',
    cancelOffer: 'G2LFKS7F',
    marketBuy: {
      WETHDAI: 'ZY3MCZGL',
      REPDAI: 'SQPX5LTY',
      ZRXDAI: 'I2CSEZNU',
      BATDAI: 'YO96DEVM',
      LINKDAI: 'LGSC8Q5P',
      WBTCDAI: 'KYGEB60P',
      DAIUSDC: 'U1Z5JU3P',
      DAITUSD: 'BDTSH5TR',
      DAIPAX: 'M7THBWON',
      REPWETH: 'VLLAAYHT',
      ZRXWETH: 'JF9UEEOK',
      BATWETH: 'OWHYTKUX',
      LINKWETH: 'JJNES6JI',
      WBTCWETH: 'PTSAJNBD',
    },
    marketSell: {
      WETHDAI: '8YEFQNNN',
      REPDAI: '2SZDFPZJ',
      ZRXDAI: 'S51SRYX2',
      BATDAI: 'PH1GFGKO',
      LINKDAI: 'VESGPUPR',
      WBTCDAI: 'NKTQDV44',
      DAIUSDC: 'KYRWHB9N',
      DAITUSD: 'A9PJLBEZ',
      DAIPAX: 'C5RE6X8P',
      REPWETH: 'A7C2WLWG',
      ZRXWETH: '8W4MXFBW',
      BATWETH: 'TORQBEHQ',
      LINKWETH: 'T7HXHZN1',
      WBTCWETH: 'EWJIJBNN',
    },
    instantBuy: {
      ETHDAI: 'VTAWCTXK',
      WETHDAI: 'BNZJHZ9P',
      REPDAI: 'K5VRX66Q',
      ZRXDAI: 'R7OGZV0L',
      BATDAI: 'AEDLSZAD',
      LINKDAI: 'VQNCUACY',
      WBTCDAI: 'YONKBX35',
      DAIUSDC: '49L0GA7T',
      DAITUSD: 'HHJQW8J7',
      DAIPAX: '4KFOQYQE',
      REPWETH: 'DHRDRZT5',
      ZRXWETH: 'T7TCR7C7',
      BATWETH: 'AKR3L53N',
      LINKWETH: 'UCVWPB9N',
      WBTCWETH: '9J760DKI',
    },
    instantSell: {
      ETHDAI: '7UHNILSC',
      WETHDAI: 'OSXOSZOC',
      REPDAI: 'JZ7BRKOZ',
      ZRXDAI: 'JIJMKJY1',
      BATDAI: '5HA04SJD',
      LINKDAI: 'BYCOKJXA',
      WBTCDAI: 'IDSRWI6A',
      DAIUSDC: 'UYBTULSZ',
      DAITUSD: 'INI7KLLG',
      DAIPAX: '0IA81GY8',
      REPWETH: 'KS03ODQE',
      ZRXWETH: 'LJA6HJQA',
      BATWETH: 'XAQLX8SH',
      LINKWETH: 'P8XSSDSX',
      WBTCWETH: 'EDGIZQGS',
    },
  },
}[env]

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
  fathom('trackGoal', id, cents * 100)
}

export function fathomInit() {
  load()
  setSiteId(config.key)
  trackPageview()
}
