import cron from 'node-cron';
import { setAccess } from './setAccess.js';

cron.schedule('0 0 * * *', () => {
    console.log('updating again', new Date());
    setAccess();
});