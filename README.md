# airtap-sauce-browsers

> **Get a list of normalized Sauce Labs browsers as [browser manifests](https://github.com/airtap/browser-manifest).**  
> Replaces [`sauce-browsers`](https://github.com/lpinca/sauce-browsers).

[![npm status](http://img.shields.io/npm/v/airtap-sauce-browsers.svg)](https://www.npmjs.org/package/airtap-sauce-browsers)
[![node](https://img.shields.io/node/v/airtap-sauce-browsers.svg)](https://www.npmjs.org/package/airtap-sauce-browsers)
[![Travis](https://img.shields.io/travis/com/airtap/sauce-browsers.svg)](https://travis-ci.com/airtap/sauce-browsers)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```js
const asb = require('airtap-sauce-browsers').promise
const manifests = await asb()

console.log(manifests)
```

```js
const asb = require('airtap-sauce-browsers').callback

asb(function (err, manifests) {
  if (err) throw err

  console.log(manifests)
})
```

For an example of the output, see [`expected.json`](expected.json). To match browser names to your own preferred alias, you can use [`browser-names`](https://github.com/airtap/browser-names).

## Differences from [`sauce-browsers`](https://github.com/lpinca/sauce-browsers)

**Breaking changes**

- New format
- Does not perform matching, that's handled by [`airtap-match-browsers`](https://github.com/airtap/match-browsers). This just returns a list of all browsers available on Sauce Labs.
- For mobile browsers, the `platform` field previously mapped to the host OS (Linux or MacOS) that runs the Android emulator or iOS simulator. It now maps to either Android or iOS.
- `name: android` only matches _Android Browser_. Previously it could match both _Android Browser_ and _Chrome for Android_. If both were available on a particular Android version then Sauce Labs would pick _Chrome for Android_. If you want to test in _Chrome for Android_, you must now use `name: and_chr` or its more descriptive alias `chrome for android`.
- iOS browsers have the name "ios_saf" (iOS Safari) rather than "ipad" or "iphone". For now, Airtap will match the old names for backwards compatibility.

**Additions**

- Also includes Appium-only browsers (missing in `sauce-browsers`) which notably includes Android 7+ and removes the need for a workaround in Airtap.
- For Android, `airtap-sauce-browsers` includes both _Chrome for Android_ and _Android Browser_ if available. This is not directly reflected in the Sauce Labs API; `airtap-sauce-browsers` infers the availability of the extra browser from `api_name` and `version`.
- Contains "preferredOver" rules that codify which Android emulator or iOS simulator should be selected by default. Airtap < 4 would pick an effectively random emulator or simulator. Airtap 4 will default to generic ones (that are not emulating a particular make or model) unless a `deviceName` is specified.
- Adds `capabilities` for Appium (if a mobile browser), legacy WebDriver (if a desktop browser) and / or W3C WebDriver (if supported by the browser)
- Includes metadata that says whether the browser needs the "loopback" functionality of Airtap.
- Includes `recommendedBackendVersion` and `supportedBackendVersions` for Appium.

## Install

With [npm](https://npmjs.org) do:

```
npm install airtap-sauce-browsers
```

## License

[MIT](LICENSE.md) © 2020-present Vincent Weevers
