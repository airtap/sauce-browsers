'use strict'

const test = require('tape')
const fs = require('fs')
const asb = require('.').factory(async function source () {
  return JSON.parse(fs.readFileSync('fixture.json', 'utf8'))
})

test('basic', async function (t) {
  t.plan(1)

  const expected = JSON.parse(fs.readFileSync('expected.json', 'utf8'))
  const actual = await asb.promise()

  t.same(actual, expected)
})
