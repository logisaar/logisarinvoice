import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

async function seed() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    const prisma = new PrismaClient({ adapter } as any);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@paylink.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    const hash = await bcrypt.hash(adminPassword, 10);

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { email: adminEmail, passwordHash: hash, name: 'Logisaar Admin' },
        create: {
            email: adminEmail,
            name: 'Logisaar Admin',
            passwordHash: hash,
            role: 'admin',
        },
    });

    console.log('✅ Admin credentials updated:');
    console.log('   Email:   ', user.email);
    console.log('   Password: ', adminPassword);

    await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
