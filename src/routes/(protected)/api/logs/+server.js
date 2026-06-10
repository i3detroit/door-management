import { produce } from 'sveltekit-sse';

export const POST = () => {
    return produce(async ({ emit }) => {
        const captureConsole = (fn, level) => {
            const fnOriginal = fn;
            return data => {
                const timestamp = (new Date()).toISOString();
                emit('line', JSON.stringify({
                    timestamp, body: data.toString(), level
                }));
                fnOriginal(data);
            };
        };

        console.log = captureConsole(console.log, 'log');
        console.warn = captureConsole(console.warn, 'warn');
        console.error = captureConsole(console.error, 'error');
    });
};