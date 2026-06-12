targetScope = 'resourceGroup'

@description('Azure region for all SSIP resources.')
param location string = resourceGroup().location

@description('Environment name.')
param environmentName string = 'dev'

@description('Tags applied to all resources.')
param tags object = {
  project: 'ssip'
  environment: environmentName
  managedBy: 'bicep'
}

param deploymentStorageAccountName string
param evidenceStorageAccountName string
param appInsightsName string
param functionPlanName string
param functionAppName string
param webPlanName string
param webAppName string
param sqlServerName string
param sqlDatabaseName string
param sqlAdminUsername string
@secure()
param sqlAdminPassword string
@secure()
param adminSharedKeyHash string
@secure()
param adminSessionSigningSecret string = ''

param frontendAllowedOrigins array
param sqlEntraAdminLogin string = ''
param sqlEntraAdminObjectId string = ''
param sqlEntraAdminTenantId string = subscription().tenantId
param functionAdditionalAppSettings object = {}

module storage './modules/storage.bicep' = {
  name: 'ssip-storage'
  params: {
    location: location
    tags: tags
    deploymentStorageAccountName: deploymentStorageAccountName
    evidenceStorageAccountName: evidenceStorageAccountName
    functionAppName: functionAppName
  }
}

module appInsights './modules/app-insights.bicep' = {
  name: 'ssip-app-insights'
  params: {
    location: location
    tags: tags
    appInsightsName: appInsightsName
  }
}

module sql './modules/sql.bicep' = {
  name: 'ssip-sql'
  params: {
    location: location
    tags: tags
    sqlServerName: sqlServerName
    sqlDatabaseName: sqlDatabaseName
    sqlAdminUsername: sqlAdminUsername
    sqlAdminPassword: sqlAdminPassword
    entraAdminLogin: sqlEntraAdminLogin
    entraAdminObjectId: sqlEntraAdminObjectId
    entraTenantId: sqlEntraAdminTenantId
  }
}

module functionApp './modules/function-app.bicep' = {
  name: 'ssip-function-app'
  params: {
    location: location
    tags: tags
    functionPlanName: functionPlanName
    functionAppName: functionAppName
    deploymentStorageConnectionString: storage.outputs.deploymentStorageConnectionString
    deploymentContainerUrl: storage.outputs.deploymentContainerUrl
    appInsightsConnectionString: appInsights.outputs.connectionString
    appInsightsInstrumentationKey: appInsights.outputs.instrumentationKey
    allowedOrigins: frontendAllowedOrigins
    sqlServerFqdn: sql.outputs.sqlServerFqdn
    sqlDatabaseName: sql.outputs.sqlDatabaseName
    sqlAdminUsername: sqlAdminUsername
    sqlAdminPassword: sqlAdminPassword
    adminSharedKeyHash: adminSharedKeyHash
    adminSessionSigningSecret: adminSessionSigningSecret
    evidenceStorageConnectionString: storage.outputs.evidenceStorageConnectionString
    additionalAppSettings: functionAdditionalAppSettings
  }
}

module webApp './modules/web-app.bicep' = {
  name: 'ssip-web-app'
  params: {
    location: location
    tags: tags
    webPlanName: webPlanName
    webAppName: webAppName
    apiBaseUrl: functionApp.outputs.functionAppUrl
  }
}

output functionApiBaseUrl string = functionApp.outputs.functionAppUrl
output frontendUrl string = webApp.outputs.webAppUrl
output sqlServerFqdn string = sql.outputs.sqlServerFqdn
output evidenceStorageAccountName string = storage.outputs.evidenceStorageAccountName
