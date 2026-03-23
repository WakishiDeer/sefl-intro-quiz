/**
 * main.bicep — wdp-self-intro-quiz Azure インフラストラクチャ
 *
 * Azure Container Apps + Container Registry + Key Vault + Log Analytics
 * を構成し、アプリケーションをデプロイする。
 */

targetScope = 'resourceGroup'

// ============================================================
// パラメータ
// ============================================================

@minLength(1)
@maxLength(64)
@description('リソース名のベースとなる環境名')
param environmentName string

@minLength(1)
@description('リソースをデプロイするリージョン')
param location string = resourceGroup().location

@description('Container App のコンテナイメージ（初回デプロイ時はデフォルトを使用）')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('アプリケーションのリッスンポート')
param appPort int = 3001

@description('Azure OpenAI デプロイメント名')
param azureOpenAIDeploymentName string = 'gpt-51'

@description('Azure OpenAI モデル名')
param azureOpenAIModelName string = 'gpt-5.1'

@description('Azure OpenAI をデプロイするリージョン（モデル可用性に依存）')
param openAILocation string = 'eastus'

// ============================================================
// 変数
// ============================================================

var abbrs = {
  containerAppsEnvironment: 'cae-'
  containerApp: 'ca-'
  containerRegistry: 'cr'
  logAnalyticsWorkspace: 'log-'
  keyVault: 'kv-'
  managedIdentity: 'id-'
  openAI: 'oai-'
}

var resourceToken = toLower(uniqueString(resourceGroup().id, environmentName))

// ============================================================
// Log Analytics Workspace
// ============================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${abbrs.logAnalyticsWorkspace}${resourceToken}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================================
// User-Assigned Managed Identity
// ============================================================

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${abbrs.managedIdentity}${resourceToken}'
  location: location
}

// ============================================================
// Container Registry
// ============================================================

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: '${abbrs.containerRegistry}${resourceToken}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
  }
}

// AcrPull ロールをマネージド ID に割り当て（Container App がレジストリからイメージを取得するため）
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, managedIdentity.id, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================
// Key Vault（API キーの安全な管理）
// ============================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${abbrs.keyVault}${resourceToken}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}

// Key Vault Secrets User ロールをマネージド ID に割り当て
resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentity.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================
// Azure OpenAI Service
// ============================================================

resource openAI 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${abbrs.openAI}${resourceToken}'
  location: openAILocation
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${abbrs.openAI}${resourceToken}'
    publicNetworkAccess: 'Enabled'
  }
}

// GPT デプロイメント
resource openAIDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAI
  name: azureOpenAIDeploymentName
  sku: {
    name: 'GlobalStandard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: azureOpenAIModelName
      version: '2025-11-13'
    }
  }
}

// Azure OpenAI の API キーを Key Vault に格納
resource openAIApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-openai-api-key'
  properties: {
    value: openAI.listKeys().key1
  }
}

// Cognitive Services OpenAI User ロールをマネージド ID に割り当て
resource openAIUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAI.id, managedIdentity.id, '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
  scope: openAI
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================================
// Container Apps Environment
// ============================================================

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${abbrs.containerAppsEnvironment}${resourceToken}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ============================================================
// Container App
// ============================================================

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${abbrs.containerApp}${resourceToken}'
  location: location
  tags: {
    'azd-service-name': 'app'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: appPort
        transport: 'http'
        // インメモリストア保護: クライアント単位の sticky session。
        // ※ ルーム単位のアフィニティは不可のため、maxReplicas=1 が本質的な対策。
        // Redis 移行後は状態共有により不要になる（tech-spec.md §5.5 / ADR 0006 参照）
        stickySessions: {
          affinity: 'sticky'
        }
        // WebSocket サポート（Socket.IO に必要）
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: managedIdentity.id
        }
      ]
      secrets: [
        {
          name: 'azure-openai-api-key'
          keyVaultUrl: openAIApiKeySecret.properties.secretUri
          identity: managedIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'PORT'
              value: string(appPort)
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'AI_PROVIDER'
              value: 'azure-openai'
            }
            {
              name: 'CLIENT_URL'
              value: ''
            }
            {
              name: 'MIN_PARTICIPANTS'
              value: '3'
            }
            {
              name: 'QUESTION_TIME_LIMIT'
              value: '30000'
            }
            {
              name: 'ROOM_TIMEOUT_MINUTES'
              value: '30'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: openAI.properties.endpoint
            }
            {
              name: 'AZURE_OPENAI_API_KEY'
              secretRef: 'azure-openai-api-key'
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: azureOpenAIDeploymentName
            }
          ]
        }
      ]
      // インメモリストア（Map）のため水平スケール不可。
      // Redis 移行後に maxReplicas を引き上げること（tech-spec.md §5.5 参照）
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// ============================================================
// Outputs
// ============================================================

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.name
output AZURE_CONTAINER_APP_NAME string = containerApp.name
output AZURE_CONTAINER_APP_FQDN string = containerApp.properties.configuration.ingress.fqdn
output APP_URL string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output AZURE_KEY_VAULT_NAME string = keyVault.name
output AI_PROVIDER string = aiProvider
output AZURE_OPENAI_ENDPOINT string = useAzureOpenAI ? openAI!.properties.endpoint : ''
output AZURE_OPENAI_DEPLOYMENT string = azureOpenAIDeploymentName
