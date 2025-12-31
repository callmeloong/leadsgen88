
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Deleting all matches...')
        await prisma.match.deleteMany()

        console.log('Deleting all players...')
        await prisma.player.deleteMany()

        console.log('Database reset successfully!')
    } catch (error) {
        console.error('Error modifying database:', error)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
