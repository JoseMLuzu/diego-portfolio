import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'rr2covtm',
    dataset: 'production',
  },
  deployment: {
    appId: 'vnwli5kwlfa5nh0xcw1zpu9e',
    // Build the installed, locked version instead of fetching a remote runtime.
    autoUpdates: false,
  },
})
