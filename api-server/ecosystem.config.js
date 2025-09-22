module.exports = {
  apps: [
    {
      name: 'clothing-space-capsule-api',
      script: './src/app.js',
      instances: 'max', // 根据CPU核心数启动实例
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      combine_logs: true,
      merge_logs: true
    }
  ]
};