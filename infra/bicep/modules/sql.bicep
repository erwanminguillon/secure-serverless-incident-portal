targetScope = 'resourceGroup'

param location string
param tags object
param sqlServerName string
param sqlDatabaseName string
param sqlAdminUsername string

@secure()
param sqlAdminPassword string

@description('Optional Microsoft Entra administrator login for the SQL server.')
param entraAdminLogin string = ''

@description('Optional Microsoft Entra administrator object ID.')
param entraAdminObjectId string = ''

@description('Optional Microsoft Entra tenant ID.')
param entraTenantId string = subscription().tenantId

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    administratorLogin: sqlAdminUsername
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    restrictOutboundNetworkAccess: 'Disabled'
    version: '12.0'
  }
}

resource sqlEntraAdmin 'Microsoft.Sql/servers/administrators@2023-08-01-preview' = if (!empty(entraAdminLogin) && !empty(entraAdminObjectId)) {
  parent: sqlServer
  name: 'ActiveDirectory'
  properties: {
    administratorType: 'ActiveDirectory'
    login: entraAdminLogin
    sid: entraAdminObjectId
    tenantId: entraTenantId
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  tags: tags
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    autoPauseDelay: 60
    minCapacity: json('0.5')
    requestedBackupStorageRedundancy: 'Local'
    readScale: 'Disabled'
    zoneRedundant: false
  }
}

output sqlServerName string = sqlServer.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = sqlDatabase.name