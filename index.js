'use strict'

const b = require('browser-names')
const fetch = require('minipass-fetch')

function factory (source) {
  return {
    callback (callback) {
      source()
        .then(manifests => process.nextTick(callback, null, normalize(manifests)))
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
function normalize (manifests) {
  // Android 6.0 defaults to Chrome but can also be paired with Android Browser.
  // This is not reflected in the Sauce Labs API.
  // See https://wiki.saucelabs.com/display/DOCS/2017/03/31/Android+6.0+and+7.0+Support+Released
  manifests.filter(manifest =>
    manifest.automation_backend === 'appium' &&
    is(manifest.api_name, 'android') &&
    major(manifest.short_version) === 6
  ).forEach(manifest => {
    manifests.push({ ...manifest, browser_name: 'Browser' })
  })

  return manifests.map(function (manifest) {
    const automationBackend = manifest.automation_backend
    const lowApiName = manifest.api_name.toLowerCase()
    const capabilities = {}

    // The version of a browser or device
    const version = manifest.short_version.replace(/\.$/, '')

    if (automationBackend !== 'webdriver' && automationBackend !== 'appium') {
      // Can't happen, at the time of writing.
      return null
    }

    if (manifest.device || automationBackend === 'appium') {
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
        capabilities.appium.browserName = manifest.browser_name ||
          (major(version) >= 6 ? 'Chrome' : 'Browser')
        capabilities.appium.platformName = 'Android'
      } else {
        // Something new
        return null
      }

      // Note: on Android, there's no way to specify the Chrome version
      // (e.g. 78). We can only match by Android version (e.g. 7).
      capabilities.appium.platformVersion = version
      capabilities.appium.deviceName = manifest.long_name
    } else {
      // Capabilities for Selenium 2/3
      // See https://wiki.saucelabs.com/display/DOCS/Test+Configuration+Options#TestConfigurationOptions-Selenium-SpecificOptions
      // See https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities
      capabilities.legacy = {
        // Selenium is case-sensitive. Use the original values.
        browserName: manifest.api_name,
        version: version,
        platform: manifest.os
      }

      // Capabilities for W3C WebDriver
      // See https://wiki.saucelabs.com/display/DOCS/W3C+Capabilities+Support
      if ((is(manifest.api_name, 'firefox') && major(version) >= 53) ||
        (is(manifest.api_name, 'chrome') && major(version) >= 61) ||
        (is(manifest.api_name, 'internet explorer') && major(version) === 11)) {
        capabilities.w3c = {
          browserName: manifest.api_name,
          browserVersion: version,
          platformName: manifest.os
        }

        // "For tests on Google Chrome version 74 or lower.."
        if (is(manifest.api_name, 'chrome') && major(version) <= 74) {
          // ".. the W3C capability must be set as an experimental option"
          capabilities.w3c.w3c = true
        }
      }
    }

    const name = getName(lowApiName, automationBackend, capabilities)
    const title = getTitle(name, capabilities)

    // For mobile (appium) devices, "manifest.os" is the host OS that runs
    // the emulator or simulator. Use Appium's platform name instead.
    const platform = (capabilities.appium ? capabilities.appium.platformName : manifest.os).toLowerCase()

    const result = {
      name,
      version,
      platform,
      title,
      wants: {
        // TODO: do ios_saf and the new edge require loopback?
        loopback: ['safari', 'ios_saf', 'edge'].includes(name),
        tunnel: true
      },
      automationBackend,
      capabilities
    }

    if (manifest.recommended_backend_version) {
      result.recommendedBackendVersion = manifest.recommended_backend_version
    }

    if (manifest.supported_backend_versions) {
      result.supportedBackendVersions = manifest.supported_backend_versions
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

function getName (lowApiName, automationBackend, capabilities) {
  if (automationBackend === 'appium') {
    if (is(capabilities.appium.platformName, 'android')) {
      if (is(capabilities.appium.browserName, 'chrome')) {
        return 'and_chr'
      } else if (is(capabilities.appium.browserName, 'browser')) {
        return 'android'
      }
    }

    if (is(capabilities.appium.platformName, 'ios')) {
      return 'ios_saf'
    }
  }

  return b.common(lowApiName) || lowApiName
}

function getTitle (name, capabilities) {
  if (capabilities.appium) {
    const c = capabilities.appium
    const browserTitle = b.title(name) || ucfirst(c.browserName)

    return `Sauce Labs ${browserTitle} on ${c.platformName} ${c.platformVersion} on ${c.deviceName}`
  } else {
    const c = capabilities.legacy
    const browserTitle = b.title(name) || ucfirst(c.browserName)

    return `Sauce Labs ${browserTitle} ${c.version} on ${c.platform}`
  }
}

function ucfirst (str) {
  return str[0].toUpperCase() + str.slice(1)
}
