import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'rr2covtm',
    dataset: 'production',
  },
  deployment: {
    // Build the installed, locked version instead of fetching a remote runtime.
    autoUpdates: false,
  },
})
