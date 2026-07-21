/**
 * Extends app.json. When MOCK_BUILD=1 (the mobile-mock-build workflow), the
 * app gets a separate identity — different name and Android package — so the
 * mock test build installs alongside the real app.
 */
module.exports = ({ config }) => {
  if (process.env.MOCK_BUILD !== '1') {
    return config
  }
  return {
    ...config,
    name: 'Mow Mock',
    android: {
      ...config.android,
      package: 'nz.mow.app.mock',
    },
  }
}
