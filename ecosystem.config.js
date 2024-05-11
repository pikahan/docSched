module.exports = {
  apps : [{
    name: 'docSched',
    script: '/app/main.js',
    source_map_support: false,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'development',
    },
    env_prod: {
      NODE_ENV: 'production',
    }
  }],
};
