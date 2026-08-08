import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // 测试文件匹配规则
    include: ['tests/**/*.test.ts'],
    // 使用 node 环境（测试纯函数，不需要浏览器 DOM）
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
