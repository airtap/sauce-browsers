'use strict'

const fsp = require('fs').promises
const fetch = require('minipass-fetch')
const asb = require('.')

async function main () {
  const fixture = await fetchFixture()
  const expected = await asb.promise()

  await fsp.writeFile('fixture.json', JSON.stringify(fixture, null, 2))
  await fsp.writeFile('expected.json', JSON.stringify(expected, null, 2))
}

async function fetchFixture () {
  const res = await fetch('https://saucelabs.com/rest/v1/info/platforms/all')
  return res.json()
}

main()
