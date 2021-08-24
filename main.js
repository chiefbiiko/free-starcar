const { JSDOM } = require("jsdom")
const fetch = require("node-fetch")

const config = {
  from: process.env.FROM?.toLowerCase(),
  to: process.env.TO?.toLowerCase()
}

function cut(s) {
  s = s.trim()
  return s.slice(0, s.indexOf("\n"))
}

function clr(s) {
  return s.replace(/\s+/, " ")
}

async function mine(daemon = false, stash = []) {
  const res = await fetch("https://www.starcar.de/specials/kostenlos-mieten/")
  const txt = await res.text()

  const raw = new JSDOM(txt).window.document.getElementsByClassName(
    "area-flip klm"
  )

  let inf = Array.from(raw).map(ofr => {
    const dts = ofr.getElementsByClassName("col-xs-5 bg-lightyellow klm-date")

    const loc = Array.from(
      ofr.getElementsByClassName("headline center-xs")
    ).filter(ele => ele.getAttribute("style") === "font-size: 1.1em")

    return {
      startDate: clr(dts.item(0).textContent),
      endDate: clr(dts.item(1).textContent),
      startLocation: cut(loc[0].textContent),
      endLocation: cut(loc[1].textContent)
    }
  })

  if (config.from && config.to) {
    inf = inf.filter(
      inf =>
        inf.startLocation.toLowerCase().includes(config.from) &&
        inf.endLocation.toLowerCase().includes(config.to)
    )
  } else if (config.from || config.to) {
    inf = inf.filter(
      inf =>
        inf.startLocation.toLowerCase().includes(config.from) ||
        inf.endLocation.toLowerCase().includes(config.to)
    )
  }

  if (inf.length) {
    const uni = inf
      // deduplicating the freshly scraped object array
      .filter(
        (v, i, a) =>
          a.findIndex(
            t =>
              t.startDate === v.startDate &&
              t.endDate === v.endDate &&
              t.startLocation === v.startLocation &&
              t.endLocation === v.endLocation
          ) === i
      )
      // only pickin' items not yet stashed
      .filter(
        o =>
          !stash.some(
            s =>
              s.startLocation === o.startLocation &&
              s.endLocation === o.endLocation &&
              s.startDate === o.startDate &&
              s.endDate === o.endDate
          )
      )
    Array.prototype.push.apply(stash, uni)

    if (uni.length) {
      console.log(
        `[${new Date().toISOString()}] 🎉 found something\n${JSON.stringify(
          uni,
          null,
          2
        )}`
      )
    } else {
      console.log(`[${new Date().toISOString()}] 🕳️ nothing ${daemon ? "new" : "found"}`)
    }
  } else {
    console.log(`[${new Date().toISOString()}] 🕳️ nothing ${daemon ? "new" : "found"}`)
  }
}

function main() {
  const daemon = process.argv.some(arg => arg === "-D" || arg === "--daemon")
  if (daemon) {
    console.log(`[${new Date().toISOString()}] 👺 startin' a daemon`)
    const stash = []
    mine(daemon, stash)
    setInterval(mine.bind(null, daemon, stash), 60000)
  } else {
    mine()
  }
}

main()
