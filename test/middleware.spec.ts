// This file is mainly to test certain scenarios that typical loggers export as first-class

import { IncomingMessage, OutgoingMessage } from 'http';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';

import * as diary from '../src';
import * as middleware from '../src/middleware';
import { reset } from './helpers';

const json = suite('json');
reset(json);

json('middleware as json', () => {
	const events: any = [];

	const suite = diary.diary('json');
	middleware.json(suite);
	// The below two lines are just for the unit tests, typically you'd just output directly in the middleware
	diary.middleware(event => events.push(event.message), suite);
	diary.middleware(() => false, suite);

	suite.info('info a');
	suite.debug('debug a');
	suite.debug('debug b', { foo: 'bar' });

	assert.snapshot(events.join('\n'), `{"name":"json","level":"info","message":"info a","extra":[]}
{"name":"json","level":"debug","message":"debug a","extra":[]}
{"name":"json","level":"debug","message":"debug b","extra":[{"foo":"bar"}]}`);
});

json.run();

const http = suite('http');
reset(http);

http('should format', () => {
	const events: any = [];

	const suite = diary.diary('json');
	const http_hook = middleware.http('url: {url} method: {method} status: {status} referer: {referrer} ua: {user-agent}', suite);
	diary.middleware(event => events.push(event.message), suite);
	diary.middleware(() => false, suite);

	// @ts-expect-error we are just mocking
	const request: IncomingMessage = {
		url: 'http://test-url.com',
		headers: {
			'user-agent': 'UA test',
			referer: 'referer test',
		},
		statusCode: 200,
		method: 'POST',
	};
	// @ts-expect-error we are just mocking
	const response: OutgoingMessage = {
		headersSent: true,
	};
	http_hook(request, response, () => {
	});

	assert.equal(events, ['url: http://test-url.com method: POST status: 200 referer: referer test ua: UA test']);
});

http.run();

const with_context = suite('with context');
reset(with_context);

with_context('context aot', () => {
	const events: any = [];

	const suite = diary.diary('json');
	let context = { foo: 'bar' };
	// Imagine this existing in some entrypoint
	diary.middleware(event => {
		event.extra.unshift(context);
	}, suite);
	diary.middleware(event => events.push(event), suite);
	diary.middleware(() => false, suite);

	suite.info('info a');
	suite.debug('debug a');

	assert.equal(events[0].extra[0], { foo: 'bar' });
	assert.equal(events[1].extra[0], { foo: 'bar' });
});

with_context.run();
