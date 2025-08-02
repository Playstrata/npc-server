import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding OAuth providers...')

  // Create OAuth providers
  const oauthProviders = [
    {
      id: 'oauth_github',
      providerId: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub account for easy login',
      iconName: 'faGithub',
      enabled: true,
      displayOrder: 1
    },
    {
      id: 'oauth_google',
      providerId: 'google',
      name: 'Google',
      description: 'Connect your Google account for easy login',
      iconName: 'faGoogle',
      enabled: true,
      displayOrder: 2
    },
    {
      id: 'oauth_apple',
      providerId: 'apple',
      name: 'Apple ID',
      description: 'Connect your Apple ID for easy login',
      iconName: 'faApple',
      enabled: true,
      displayOrder: 3
    }
  ]

  for (const provider of oauthProviders) {
    await prisma.oAuthProvider.upsert({
      where: { providerId: provider.providerId },
      update: provider,
      create: provider
    })
    console.log(`✅ Created/Updated OAuth provider: ${provider.name}`)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })