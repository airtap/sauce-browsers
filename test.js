'use strict'

const test = require('tape')
const fs = require('fs')
const asb = require('.').factory(async function source () {
  return JSON.parse(fs.readFileSync('fixture.json', 'utf8'))
})

// ;(async function writeFixture () {
//   const asb = require('.')
//   const browsers = await asb.promise()
//   fs.writeFileSync('expected.json', JSON.stringify(browsers, null, 2))
// })()

test('basic', async function (t) {
  t.plan(1)

  const expected = JSON.parse(fs.readFileSync('expected.json', 'utf8'))
  const actual = await asb.promise()

  t.same(actual, expected)
})
