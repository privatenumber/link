import type { Readable } from 'stream';

export const streamWaitFor = (
	stream: Readable,
	match: string,
	timeout = 5000,
) => {
	let listener: (data: Buffer) => void;
	let timeoutId: NodeJS.Timeout;
	return new Promise<void>((resolve, reject) => {
		listener = (data) => {
			const string_ = data.toString();
			if (string_.includes(match)) {
				resolve();
			}
		};

		stream.on('data', listener);
		timeoutId = setTimeout(
			() => reject(new Error('Timeout')),
			timeout,
		);
	}).finally(() => {
		clearTimeout(timeoutId);
		stream.off('data', listener);
	});
};
