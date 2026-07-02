module.exports = {
  apps: [
    {
      name: "adforge-ai",
      script: "node_modules/.bin/next",
      args: "start -p 3103",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: "3103",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
