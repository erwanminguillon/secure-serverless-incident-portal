targetScope = 'resourceGroup'

param location string
param tags object
param webPlanName string
param webAppName string
param apiBaseUrl string

resource webPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: webPlanName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
    size: 'F1'
    family: 'F'
    capacity: 1
  }
  properties: {
    reserved: true
    perSiteScaling: false
    zoneRedundant: false
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: webPlan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'pm2 serve /home/site/wwwroot --spa --no-daemon'
      alwaysOn: false
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: false
      httpLoggingEnabled: true
      use32BitWorkerProcess: true
      appSettings: [
        {
          name: 'VITE_API_BASE_URL'
          value: apiBaseUrl
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output webAppDefaultHostName string = webApp.properties.defaultHostName
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
