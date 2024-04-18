import { InfisicalClient } from '@infisical/sdk'
import '@johnlindquist/kit'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

const OPTIONS = ['Sync', 'Pull', 'Push'] as const
type Option = (typeof OPTIONS)[number]

const envFile = fs.readFileSync('.env')
const localSecrets = dotenv.parse(envFile)

const clientId = await env('INFISICAL_CLIENT_ID')
const clientSecret = await env('INFISICAL_CLIENT_SECRET')
const projectId = await env('INFISICAL_PROJECT_ID')
const environment = 'dev'
const infisical = new InfisicalClient({ clientId, clientSecret })
const infisicalSecrets: Record<string, string> = (await infisical.listSecrets({ projectId, environment })).reduce(
  (acc, secret) => {
    acc[secret.secretKey] = secret.secretValue
    return acc
  },
  {}
)

const pullSecrets = async () => {
  for (const [key, infisicalValue] of Object.entries(infisicalSecrets)) {
    const localValue = localSecrets[key]

    if (!localValue) {
      console.log('Creating Local Secret', key)
      localSecrets[key] = infisicalValue
      continue
    }

    if (infisicalValue !== localValue) {
      console.log('Updating Local Secret', key)
      localSecrets[key] = infisicalValue
    }
  }
}

const pushSecrets = async () => {
  for (const [key, localValue] of Object.entries(localSecrets)) {
    const infisicalValue = infisicalSecrets[key]

    if (!infisicalValue) {
      console.log('Creating Infisical Secret', key)
      await infisical.createSecret({ projectId, environment, secretName: key, secretValue: localValue })
      continue
    }

    if (localValue !== infisicalValue) {
      console.log('Updating Infisical Secret', key)
      await infisical.updateSecret({ projectId, environment, secretName: key, secretValue: localValue })
    }
  }
}

const updateEnvFile = () => {
  fs.writeFileSync(
    '.env',
    Object.entries(localSecrets)
      .sort(([a_key], [z_key]) => a_key.localeCompare(z_key))
      .map(([key, value]) => `${key}='${value}'`)
      .join('\n')
  )
}

const choice = await arg<Option>('Select Option...', [...OPTIONS])

switch (choice) {
  case 'Sync':
    await pullSecrets()
    await pushSecrets()
    updateEnvFile()
    break
  case 'Pull':
    await pullSecrets()
    updateEnvFile()
    break
  case 'Push':
    await pushSecrets()
    break
}
