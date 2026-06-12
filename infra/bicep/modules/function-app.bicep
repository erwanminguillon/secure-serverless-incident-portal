targetScope = 'resourceGroup'

param location string
param tags object
param functionPlanName string
param functionAppName string
param deploymentStorageConnectionString string
param deploymentContainerUrl string
param appInsightsConnectionString string
param appInsightsInstrumentationKey string
param allowedOrigins array
param sqlServerFqdn string
param sqlDatabaseName string
param sqlAdminUsername string
@secure()
param sqlAdminPassword string
@secure()
param adminSharedKeyHash string
@secure()
param adminSessionSigningSecret string = ''
param evidenceStorageConnectionString string = ''
param additionalAppSettings object = {}

resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: functionPlanName
  location: location
  tags: tags
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
    size: 'FC1'
    family: 'FC'
    capacity: 0
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

var sqlConnectionString = 'Server=tcp:${sqlServerFqdn},1433;Initial Catalog=${sqlDatabaseName};Persist Security Info=False;User ID=${sqlAdminUsername};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

var defaultAppSettings = {
  DEPLOYMENT_STORAGE_CONNECTION_STRING: deploymentStorageConnectionString
  AzureWebJobsStorage: deploymentStorageConnectionString
  FUNCTIONS_EXTENSION_VERSION: '~4'
  FUNCTIONS_WORKER_RUNTIME: 'node'
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
  APPINSIGHTS_INSTRUMENTATIONKEY: appInsightsInstrumentationKey
  ADMIN_SHARED_KEY_HASH: adminSharedKeyHash
  ADMIN_SESSION_SIGNING_SECRET: adminSessionSigningSecret
  SQL_CONNECTION_STRING: sqlConnectionString
  SQL_SERVER_FQDN: sqlServerFqdn
  SQL_DATABASE_NAME: sqlDatabaseName
  EVIDENCE_STORAGE_CONNECTION_STRING: evidenceStorageConnectionString
  NODE_ENV: 'production'
}

var mergedAppSettings = union(defaultAppSettings, additionalAppSettings)

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    clientAffinityEnabled: false
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: deploymentContainerUrl
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      runtime: {
        name: 'node'
        version: '22'
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 100
      }
    }
    siteConfig: {
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: false
      httpLoggingEnabled: false
      functionAppScaleLimit: 100
      use32BitWorkerProcess: false
      cors: {
        allowedOrigins: allowedOrigins
        supportCredentials: true
      }
      appSettings: [for setting in items(mergedAppSettings): {
        name: setting.key
        value: string(setting.value)
      }]
    }
  }
}

output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}/api'
