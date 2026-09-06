const app = require('./app');
const env = require('./config/env');
const logger = require('./lib/logger');
const registerJobs = require('./jobs');

app.listen(env.port, () => {
  logger.info(`API đang chạy tại http://localhost:${env.port} (env=${env.nodeEnv})`);

  if (env.isProd) {
    registerJobs();
  } else {
    logger.info('Cron jobs không chạy ở development — bật bằng NODE_ENV=production nếu cần test.');
  }
});
