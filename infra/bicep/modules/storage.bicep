targetScope = 'resourceGroup'

param location string
param tags object
param deploymentStorageAccountName string
param evidenceStorageAccountName string
param functionAppName string

var deploymentContainerName = 'app-package-${functionAppName}'
var evidenceContainerName = 'evidence'

resource deploymentStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: deploymentStorageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: true
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource evidenceStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: evidenceStorageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: true
    defaultToOAuthAuthentication: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${deploymentStorage.name}/default/${deploymentContainerName}'
  properties: {
    publicAccess: 'None'
  }
}

resource evidenceContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${evidenceStorage.name}/default/${evidenceContainerName}'
  properties: {
    publicAccess: 'None'
  }
}

var deploymentStorageKey = deploymentStorage.listKeys().keys[0].value
var evidenceStorageKey = evidenceStorage.listKeys().keys[0].value

output deploymentStorageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${deploymentStorage.name};AccountKey=${deploymentStorageKey};EndpointSuffix=${environment().suffixes.storage}'
output evidenceStorageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${evidenceStorage.name};AccountKey=${evidenceStorageKey};EndpointSuffix=${environment().suffixes.storage}'
output deploymentContainerUrl string = 'https://${deploymentStorage.name}.blob.${environment().suffixes.storage}/${deploymentContainerName}'
output evidenceContainerName string = evidenceContainerName
output deploymentStorageAccountName string = deploymentStorage.name
output evidenceStorageAccountName string = evidenceStorage.name
