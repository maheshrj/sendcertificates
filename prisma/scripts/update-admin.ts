const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function updateAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    console.error('ADMIN_EMAIL not found in environment variables');
    return;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: {
        email: adminEmail,
      },
      data: {
        is_admin: true,
      },
    });

    console.log(`Updated admin status for user: ${updatedUser.email}`);
  } catch (error) {
    console.error('Error updating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdmin();