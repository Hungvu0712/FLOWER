const { PrismaClient } = require('@prisma/client');

// Singleton — tránh mở nhiều connection pool khi nodemon reload hoặc module bị require nhiều nơi.
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
