#!/usr/bin/env node

const { JSDOM } = require("jsdom")
const fetch = require("node-fetch")
const minimist = require("minimist")
const pkg = require("./package.json")

const argv = minimist(process.argv.slice(2), {
  alias: { help: "h", version: "v", daemon: "d" }
})
argv.from = argv.from?.toLowerCase()
argv.to = argv.to?.toLowerCase()

main()

function main() {
  if (argv.version) {
    console.log(`v${pkg.version}`)
  } else if (argv.help) {
    console.log(`${pkg.name} v${pkg.version}
chiefbiiko <hello@nugget.digital>
Find free STARCAR rides

USAGE:
    starcar [FLAGS] [OPTIONS]

FLAGS:
    -d, --daemon     Enables daemon mode
    -h, --help       Prints help information
    -v, --version    Prints version information

OPTIONS:
    --from            Start location
    --to              Destination
`)
  } else if (argv.daemon) {
    console.log(`[${new Date().toISOString()}] 👺 startin' a daemon`)
    const stash = []
    mine(argv.daemon, stash)
    setInterval(mine.bind(null, argv.daemon, stash), 60000)
  } else {
    mine()
  }
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

  if (argv.from && argv.to) {
    inf = inf.filter(
      inf =>
        inf.startLocation.toLowerCase().includes(argv.from) &&
        inf.endLocation.toLowerCase().includes(argv.to)
    )
  } else if (argv.from || argv.to) {
    inf = inf.filter(
      inf =>
        inf.startLocation.toLowerCase().includes(argv.from) ||
        inf.endLocation.toLowerCase().includes(argv.to)
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
      console.log(
        `[${new Date().toISOString()}] 🕳️ nothing ${daemon ? "new" : "found"}`
      )
    }
  } else {
    console.log(
      `[${new Date().toISOString()}] 🕳️ nothing ${daemon ? "new" : "found"}`
    )
  }
}

function cut(s) {
  s = s.trim()
  return s.slice(0, s.indexOf("\n"))
}

function clr(s) {
  return s.replace(/\s+/, " ")
}
