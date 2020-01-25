'use strict'

const b = require('browser-names')
const path = require('path')
const home = require('os').homedir()
const cacheManager = path.join(home, '.airtap', 'sauce-browsers')
const fetch = require('make-fetch-happen').defaults({ cacheManager })

function factory (source) {
  return {
    callback (callback) {
      source()
        .then(specs => process.nextTick(callback, null, normalize(specs)))
        .catch(err => process.nextTick(callback, err))
    },

    async promise () {
      return normalize(await source())
    },

    factory
  }
}

module.exports = factory(async function () {
  const res = await fetch('https://saucelabs.com/rest/v1/info/platforms/all')
  return res.json()
})

// See https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options
// See https://wiki.saucelabs.com/display/DOCS/Platform+Information+Methods#PlatformInformationMethods-GetSupportedPlatforms
// See https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
function normalize (specs) {
  // Android 6.0 defaults to Chrome but can also be paired with Android Browser.
  // This is not reflected in the Sauce Labs API.
  // See https://wiki.saucelabs.com/display/DOCS/2017/03/31/Android+6.0+and+7.0+Support+Released
  specs.filter(spec =>
    spec.automation_backend === 'appium' &&
    is(spec.api_name, 'android') &&
    major(spec.short_version) === 6
  ).forEach(spec => {
    specs.push({ ...spec, browser_name: 'Browser' })
  })

  return specs.map(function (spec) {
    const automationBackend = spec.automation_backend
    const lowApiName = spec.api_name.toLowerCase()
    const capabilities = {}

    // The version of a browser or device
    const version = spec.short_version.replace(/\.$/, '')

    if (automationBackend !== 'webdriver' && automationBackend !== 'appium') {
      // Can't happen, at the time of writing.
      return null
    }

    if (spec.device || automationBackend === 'appium') {
      // I don't know why Sauce Labs returns mobile devices with a webdriver
      // backend, while it would actually use appium. Let's ignore these.
      if (automationBackend !== 'appium') return null

      // Capabilities for Appium
      // See http://appium.io/docs/en/writing-running-appium/caps/index.html
      // See https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Appium-SpecificOptions
      capabilities.appium = {}

      if (lowApiName === 'ipad' || lowApiName === 'iphone') {
        capabilities.appium.browserName = 'Safari'
        capabilities.appium.platformName = 'iOS'
      } else if (lowApiName === 'android') {
        // "Browser" is aka "Android Browser"
        capabilities.appium.browserName = spec.browser_name ||
          (major(version) >= 6 ? 'Chrome' : 'Browser')
        capabilities.appium.platformName = 'Android'
      } else {
        // Something new
        return null
      }

      // Note: on Android, there's no way to specify the Chrome version
      // (e.g. 78). We can only match by Android version (e.g. 7).
      capabilities.appium.platformVersion = version
      capabilities.appium.deviceName = spec.long_name
    } else {
      // Capabilities for Selenium 2/3
      // See https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Selenium-SpecificOptions
      // See https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities
      capabilities.legacy = {
        // Selenium is case-sensitive. Use the original values.
        browserName: spec.api_name,
        version: version,
        platform: spec.os
      }

      // Capabilities for W3C WebDriver
      // See https://wiki.saucelabs.com/display/DOCS/W3C+Capabilities+Support
      if ((is(spec.api_name, 'firefox') && major(version) >= 53) ||
        (is(spec.api_name, 'chrome') && major(version) >= 61) ||
        (is(spec.api_name, 'internet explorer') && major(version) === 11)) {
        capabilities.w3c = {
          browserName: spec.api_name,
          browserVersion: version,
          platformName: spec.os
        }

        // "For tests on Google Chrome version 74 or lower.."
        if (is(spec.api_name, 'chrome') && major(version) <= 74) {
          // ".. the W3C capability must be set as an experimental option"
          capabilities.w3c.w3c = true
        }
      }
    }

    const names = getNames(lowApiName, automationBackend, capabilities)
    const result = {
      provider: 'sauce',
      name: names,
      version,

      // For mobile (appium) devices, "spec.os" is the host OS that runs
      // the emulator or simulator. Use Appium's platform name instead.
      platform: (capabilities.appium ? capabilities.appium.platformName : spec.os).toLowerCase(),
      wants: {
        // TODO: does the new edge require loopback?
        loopback: oneOf(names, 'safari', 'ios safari', 'edge'),
        sauceConnect: true
      },
      automationBackend,
      capabilities
    }

    if (spec.recommended_backend_version) {
      result.recommendedBackendVersion = spec.recommended_backend_version
    }

    if (spec.supported_backend_versions) {
      result.supportedBackendVersions = spec.supported_backend_versions
    }

    const preferredOver = {}

    if (automationBackend === 'appium') {
      // If user does not specify "deviceName" then default to the generic ones.
      const preferredAppiumDevice = (
        is(capabilities.appium.deviceName, 'android googleapi emulator') && ['Android Emulator', 'any']
      ) || (
        is(capabilities.appium.deviceName, 'android emulator') && ['any']
      ) || (
        is(capabilities.appium.deviceName, 'iphone simulator') && ['iPad Simulator', 'any']
      ) || (
        is(capabilities.appium.deviceName, 'ipad simulator') && ['any']
      )

      // If user specifies "name: android" (which matches both Chrome
      // and Android Browser) instead of the more specific names, and they
      // don't specify "browserName" either, then prefer Chrome. Which
      // matches the Sauce Labs behavior that we previously relied on.
      const preferredAppiumBrowser = (
        is(capabilities.appium.platformName, 'android') &&
        is(capabilities.appium.browserName, 'chrome') && ['Browser']
      )

      if (preferredAppiumDevice) {
        preferredOver['capabilities.appium.deviceName'] = preferredAppiumDevice
      }

      if (preferredAppiumBrowser) {
        preferredOver['capabilities.appium.browserName'] = preferredAppiumBrowser
      }
    }

    if (Object.keys(preferredOver).length) {
      result.preferredOver = preferredOver
    }

    return result
  }).filter(Boolean)
}

function is (a, b) {
  return a.toLowerCase() === b.toLowerCase()
}

function major (version) {
  return parseInt(version, 10)
}

function oneOf (haystack, ...needles) {
  return needles.some(n => haystack.includes(n))
}

function getNames (lowApiName, automationBackend, capabilities) {
  if (automationBackend === 'appium') {
    if (is(capabilities.appium.platformName, 'android')) {
      if (is(capabilities.appium.browserName, 'chrome')) {
        // Add "android" alias for airtap < 4 compatibility
        return ['android', 'and_chr']
      } else if (is(capabilities.appium.browserName, 'browser')) {
        // Add "android browser" alias to differentiate from chrome
        return ['android', 'android browser']
      }
    }

    if (is(capabilities.appium.platformName, 'ios')) {
      // Include "ipad" or "iphone" name for airtap < 4 compatibility
      return [lowApiName, 'ios_saf']
    }
  }

  return [b.common(lowApiName) || lowApiName]
}
