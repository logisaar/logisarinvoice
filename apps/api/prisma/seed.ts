import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

async function seed() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter } as any);

    const hash = await bcrypt.hash('Logisaar@2025', 10);

    const user = await prisma.user.upsert({
        where: { email: 'admin@paylink.com' },
        update: { email: 'Logisaar@gmail.com', passwordHash: hash, name: 'Logisaar Admin' },
        create: {
            email: 'Logisaar@gmail.com',
            name: 'Logisaar Admin',
            passwordHash: hash,
            role: 'admin',
        },
    });

    console.log('✅ Admin credentials updated:');
    console.log('   Email:   ', user.email);
    console.log('   Password: Logisaar@2025');

    await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
