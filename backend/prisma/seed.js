// Prisma Seed Script - 初始化默认管理员账号
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据库...')

  // 创建默认管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  // 先创建管理员用户
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: '系统管理员',
      email: 'admin@itd.edu.cn',
      phone: '13800138000',
    },
  })
  console.log('✅ 用户创建成功:', adminUser.username)

  // 创建管理员账号
  const adminAccount = await prisma.account.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      password: adminPassword,
      accountType: 'ADMIN',
      status: 'ACTIVE',
    },
  })
  console.log('✅ 账号创建成功:', adminAccount.accountType)

  // 创建默认权限数据
  const permissions = [
    // 用户权限
    { code: 'user:create', name: '创建用户', module: 'user' },
    { code: 'user:read', name: '查看用户', module: 'user' },
    { code: 'user:update', name: '更新用户', module: 'user' },
    { code: 'user:delete', name: '删除用户', module: 'user' },
    // 角色权限
    { code: 'role:assign', name: '分配角色', module: 'role' },
    { code: 'permission:assign', name: '分配权限', module: 'permission' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    })
  }
  console.log('✅ 权限数据初始化完成:', permissions.length, '条')

  // 给管理员分配所有权限
  const adminPerms = await prisma.permission.findMany()
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: {
        accountType_permissionId: {
          accountType: 'ADMIN',
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        accountType: 'ADMIN',
        permissionId: perm.id,
      },
    })
  }
  console.log('✅ 管理员权限分配完成')

  console.log('')
  console.log('==========================================')
  console.log('🎉 数据库初始化完成!')
  console.log('==========================================')
  console.log('')
  console.log('默认管理员账号:')
  console.log('  用户名: admin')
  console.log('  密码: admin123')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
