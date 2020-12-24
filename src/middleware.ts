import { IncomingMessage, OutgoingMessage } from 'http';
import type { Diary } from '.';
import { diary, middleware } from '.';

export function json(diary_instance?: Diary) {
	middleware((logEvent) => {
		logEvent.message = JSON.stringify(logEvent);
	}, diary_instance);
}

//-- HTTP
const HTTP_RGX = /([^{]*?)\w(?=})/g;
const HTTP_MAP: Record<
	string,
	((req: IncomingMessage, res: OutgoingMessage) => string) | string | void
> = {
	url: 'url',
	method: 'method',
	status: (req, res) => (res.headersSent ? '' + req.statusCode : ''),
	referrer: (req) => req.headers.referer,
	'user-agent': (req) => req.headers['user-agent'],
};

export function http(format: string, diary_instance: Diary = diary('http')) {
	let parts: any[] = [],
		offset = 0;
	format.replace(HTTP_RGX, (k, _, idx) => {
		parts.push(format.substring(offset, idx - 1));
		offset = idx += k.length + 1;
		parts.push((req: IncomingMessage, res: OutgoingMessage) => {
			return typeof HTTP_MAP[k] === 'string'
				? // @ts-expect-error
				  req[HTTP_MAP[k]]
				: // @ts-expect-error
				  HTTP_MAP[k](req, res);
		});
		return '';
	});
	if (offset !== format.length) {
		parts.push(format.substring(offset));
	}

	middleware((logEvent) => {
		// @ts-expect-error
		if (!logEvent.extra[0].req) return;
		// @ts-expect-error
		const req = logEvent.extra[0].req,
			// @ts-expect-error
			res = logEvent.extra[0].res;
		let msg = '',
			i = 0;
		for (; i < parts.length; i++) {
			msg += typeof parts[i] === 'string' ? parts[i] : parts[i](req, res);
		}
		logEvent.message = msg;
	}, diary_instance);

	return (req: IncomingMessage, res: OutgoingMessage, next: Function) => {
		next();
		diary_instance.info('response', { req, res });
	};
}
