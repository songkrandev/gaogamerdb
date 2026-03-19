module.exports = {
  apps: [
    {
      name: 'gaogamer-backend',
      cwd: './backend',
      script: 'python',
      args: ['-m', 'flask', 'run', '--host', '0.0.0.0', '--port', '5000'],
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'production',
        PYTHONUNBUFFERED: '1'
      },
      autorestart: true,
      max_restarts: 10,
      time: true
    },
    {
      name: 'gaogamer-frontend',
      cwd: './frontend',
      script: 'npx',
      args: ['serve', '-s', 'build', '-l', '3000'],
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      max_restarts: 10,
      time: true
    }
  ]
};
