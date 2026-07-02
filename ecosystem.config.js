module.exports = {
  apps: [
    {
      name: "adforge-ai",
      // next.config.ts sets `output: "standalone"` (used by the Docker build),
      // which means "next start" refuses to run — must use the traced server.js
      // instead. public/, .next/static, and env files must be copied alongside
      // it first (see README/deploy notes) since standalone chdir()s into
      // .next/standalone and won't find them at the repo root.
      script: ".next/standalone/server.js",
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
