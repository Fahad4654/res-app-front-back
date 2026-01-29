import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPermissions = [
  // ADMIN - Full access to everything
  { role: Role.ADMIN, resource: 'orders', action: 'view', allowed: true },
  { role: Role.ADMIN, resource: 'orders', action: 'create', allowed: true },
  { role: Role.ADMIN, resource: 'orders', action: 'update', allowed: true },
  { role: Role.ADMIN, resource: 'orders', action: 'delete', allowed: true },
  { role: Role.ADMIN, resource: 'menu', action: 'view', allowed: true },
  { role: Role.ADMIN, resource: 'menu', action: 'create', allowed: true },
  { role: Role.ADMIN, resource: 'menu', action: 'update', allowed: true },
  { role: Role.ADMIN, resource: 'menu', action: 'delete', allowed: true },
  { role: Role.ADMIN, resource: 'users', action: 'view', allowed: true },
  { role: Role.ADMIN, resource: 'users', action: 'create', allowed: true },
  { role: Role.ADMIN, resource: 'users', action: 'update', allowed: true },
  { role: Role.ADMIN, resource: 'users', action: 'delete', allowed: true },
  { role: Role.ADMIN, resource: 'categories', action: 'view', allowed: true },
  { role: Role.ADMIN, resource: 'categories', action: 'create', allowed: true },
  { role: Role.ADMIN, resource: 'categories', action: 'update', allowed: true },
  { role: Role.ADMIN, resource: 'categories', action: 'delete', allowed: true },
  { role: Role.ADMIN, resource: 'permissions', action: 'view', allowed: true },
  { role: Role.ADMIN, resource: 'permissions', action: 'update', allowed: true },

  // KITCHEN_STAFF - View and update orders (status only)
  { role: Role.KITCHEN_STAFF, resource: 'orders', action: 'view', allowed: true },
  { role: Role.KITCHEN_STAFF, resource: 'orders', action: 'update', allowed: true },
  { role: Role.KITCHEN_STAFF, resource: 'menu', action: 'view', allowed: true },

  // DELIVERY_STAFF - View ready orders and update delivery status
  { role: Role.DELIVERY_STAFF, resource: 'orders', action: 'view', allowed: true },
  { role: Role.DELIVERY_STAFF, resource: 'orders', action: 'update', allowed: true },

  // CUSTOMER_SUPPORT - View orders, customers, and limited update
  { role: Role.CUSTOMER_SUPPORT, resource: 'orders', action: 'view', allowed: true },
  { role: Role.CUSTOMER_SUPPORT, resource: 'orders', action: 'update', allowed: true },
  { role: Role.CUSTOMER_SUPPORT, resource: 'orders', action: 'delete', allowed: true },
  { role: Role.CUSTOMER_SUPPORT, resource: 'users', action: 'view', allowed: true },

  // CUSTOMER - View own orders and menu
  { role: Role.CUSTOMER, resource: 'orders', action: 'view', allowed: true },
  { role: Role.CUSTOMER, resource: 'orders', action: 'create', allowed: true },
  { role: Role.CUSTOMER, resource: 'menu', action: 'view', allowed: true },
];

async function seedPermissions() {
  console.log('Seeding default permissions...');

  for (const permission of defaultPermissions) {
    await prisma.permission.upsert({
      where: {
        role_resource_action: {
          role: permission.role,
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {
        allowed: permission.allowed,
      },
      create: permission,
    });
  }

  console.log('✅ Default permissions seeded successfully!');
}

seedPermissions()
  .catch((e) => {
    console.error('Error seeding permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
