import {
    red, yellow
} from 'kolorist';

export const waitFor = (
    test: () => Promise<boolean>,
    interval: number,
    maxTimeout: number,
    errorMessage: string,
): Promise<void> => new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = Math.floor(maxTimeout / interval);

    const attempt = async () => {
        attempts++;
        try {
            const result = await test();
            if (result) {
                return resolve();
            }
            throw new Error();
        } catch (error) {
            const numAttemptsRemaining = maxAttempts - attempts;
            console.error(red(`  😕 Error: ${errorMessage}`), ' retrying in', yellow(`${interval}ms`), '.', yellow(`${numAttemptsRemaining} attempts remaining`));
        }

        if (Date.now() - startTime >= maxTimeout) {
            console.error(red(`  😵 Error: ${errorMessage}. Giving up after ${maxAttempts} attempts`));
            return reject();
        }

        setTimeout(attempt, interval);
    };

    await attempt();
});
