# airtap-sauce-browsers

> **Get a list of normalized Sauce Labs browsers in Airtap 4 format.**  
> Intended to replace [`sauce-browsers`](https://github.com/lpinca/sauce-browsers). Stability: unstable.

[![npm status](http://img.shields.io/npm/v/airtap-sauce-browsers.svg)](https://www.npmjs.org/package/airtap-sauce-browsers)
[![node](https://img.shields.io/node/v/airtap-sauce-browsers.svg)](https://www.npmjs.org/package/airtap-sauce-browsers)
[![Travis](https://img.shields.io/travis/com/airtap/sauce-browsers.svg)](https://travis-ci.com/airtap/sauce-browsers)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```js
const asb = require('airtap-sauce-browsers').promise
const browser = await asb()

console.log(browsers)
```

```js
const asb = require('airtap-sauce-browsers').callback

asb(function (err, browsers) {
  if (err) throw err

  console.log(browsers)
})
```

For an example of the output, see [`expected.json`](expected.json). To match browser names to your own preferred alias, you can use [`browser-names`](https://github.com/airtap/browser-names).

## Differences from [`sauce-browsers`](https://github.com/lpinca/sauce-browsers)

**Incompatibilities**

- New format
- Does not perform matching, that'll be a separate module. This just returns a list of all browsers available on Sauce Labs.
- For mobile browsers, the `platform` field previously (in Zuul / Airtap / `sauce-browsers`) mapped to the host OS (Linux or MacOS) that runs the Android emulator or iOS simulator. It now maps to either Android or iOS.

**Additions**

- Also includes Appium-only browsers (missing in `sauce-browsers`)
- Adds `capabilities` for Appium (if a mobile browser), legacy WebDriver (if a desktop browser) and / or W3C WebDriver (if supported by the browser)
- For Android, it includes both Chrome and Android browser if available. This is not reflected in the Sauce Labs API or `sauce-browsers`. For compatibility with Airtap < 4, `airtap-sauce-browsers` gives both browsers the name "android" and contains "preferredOver" rules that codify which browser should be selected by default (that's Chrome). Users of Airtap 4 will have the choice of specifying a more specific `name: chrome for android` or `name: android browser` instead of `name: android`.
- iOS browsers have the additional name "ios_saf" (iOS Safari), if you don't care about which device simulator is used.
- Contains "preferredOver" rules that codify which Android emulator or iOS simulator should be selected by default. Airtap < 4 would pick an effectively random emulator or simulator. Airtap 4 will default to generic ones (that are not emulating a particular make or model) unless a `deviceName` is specified.
- Includes metadata that says whether the browser needs the "loopback" functionality of Airtap.
- Includes `recommendedBackendVersion` and `supportedBackendVersions` for Appium.

## Format

Yet to document.

## Install

With [npm](https://npmjs.org) do:

```
npm install airtap-sauce-browsers
```

## License

[MIT](LICENSE.md) © 2020-present Vincent Weevers
