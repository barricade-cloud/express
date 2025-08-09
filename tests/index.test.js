const nock          = require('nock');
const request       = require('supertest');
const express       = require('express');
const middleware    = require('../index');

const WAF_URL = 'https://waf.barricade.cloud';

const createApp = (options = {}) => {
    const app = express();
    app.use(express.json());
    app.use(middleware({
        apiKey: 'foo',
        excludeKeys: options.excludeKeys || {},
        timeout: options.timeout || 100,
    }));
    app.get('/foo', (req, res) => {
        res.status(200).send('bar');
    });
    app.post('/foo', (req, res) => {
        res.status(200).send('bar');
    });
    return app;
};

describe('Middleware', () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    describe('when waf returns 404', () => {
        it('calls next()', async () => {
            const app = createApp();

            nock(WAF_URL)
                .post('/')
                .reply(404);

            await request(app)
                .get('/foo')
                .expect(200, 'bar');
        });
    });

    describe('when waf returns 401', () => {
        it('calls next()', async () => {
            const app = createApp();

            nock(WAF_URL)
                .post('/')
                .reply(401);

            await request(app)
                .get('/foo')
                .expect(200, 'bar');
        });
    });

    describe('when waf returns 500', () => {
        it('calls next()', async () => {
            const app = createApp();

            nock(WAF_URL)
                .post('/')
                .reply(500);

            await request(app)
                .get('/foo')
                .expect(200, 'bar');
        });
    });

    describe('when waf is too long to respond', () => {
        describe('based on default timeout', () => {
            it('calls next()', async () => {
                const app = createApp();

                nock(WAF_URL)
                    .post('/')
                    .delay(100)
                    .reply(200, { action: 'block' });

                await request(app)
                    .get('/foo')
                    .expect(200, 'bar');
            });
        });

        describe('based on custom timeout', () => {
            it('calls next()', async () => {
                const app = createApp({ timeout: 200 });

                nock(WAF_URL)
                    .post('/')
                    .delay(200)
                    .reply(200, { action: 'block' });

                await request(app)
                    .get('/foo')
                    .expect(200, 'bar');
            });
        });
    });

    describe('when filters on headers', () => {
        it('does not send excluded headers', async () => {
            const excludedHeaders = ['x-secret', 'authorization'];
            const app = createApp({
                excludeKeys: {
                    headers: excludedHeaders
                }
            });

            nock(WAF_URL)
                .post('/', (body) => {
                    const sentHeaders = body.headers;
                    excludedHeaders.forEach((key) => {
                      expect(sentHeaders).not.toHaveProperty(key);
                    });
                    expect(sentHeaders).toHaveProperty('user-agent', 'test-agent');
                    return true;
                  })
                .reply(200, { action: 'allow' });

            await request(app)
                .get('/foo')
                .set('x-secret', 'supersecret')
                .set('authorization', 'Bearer token')
                .set('user-agent', 'test-agent')
                .expect(200, 'bar');
        });
    });

    describe('when filters on body', () => {
        it('does not send excluded keys in the body', async () => {
            const excludedBodyKeys = ['password', 'secret'];
            const app = createApp({
                excludeKeys: {
                    body: excludedBodyKeys,
                },
            });
        
            nock(WAF_URL)
                .post('/', (body) => {
                    const sentBody = body.body;
                    excludedBodyKeys.forEach((key) => {
                        expect(excludedBodyKeys).not.toHaveProperty(key);
                    });
                    expect(sentBody).toHaveProperty('username', 'user1');
                    return true;
                })
                .reply(200, { action: 'allow' });
        
            await request(app)
                .post('/foo')
                .send({
                    username: 'user1',
                    password: 'supersecret',
                    secret: 'hiddenvalue',
                })
                .expect(200, 'bar');
        });
    });

    it('sends headers & body', async () => {
        const app = createApp();

        nock(WAF_URL)
            .post('/', (body) => {
                const sentHeaders = body.headers;
                expect(sentHeaders).toHaveProperty('user-agent', 'test-agent');

                const sentBody = body.body;
                expect(sentBody).toHaveProperty('username', 'user1');
                expect(sentBody).toHaveProperty('password', 'supersecret');
                return true;
            })
            .reply(200, { action: 'allow' });
    
        await request(app)
            .post('/foo')
            .set('user-agent', 'test-agent')
            .send({
                username: 'user1',
                password: 'supersecret',
            })
            .expect(200, 'bar');
    });

    describe('when waf returns action=block', () => {
        it('renders block page', async () => {
            const app = createApp();

            nock(WAF_URL)
                .post('/')
                .reply(200, { action: 'block' });

            await request(app)
                .get('/foo')
                .expect(403, /Your request was blocked/);
        });
    });

    describe('when waf returns action=allow', () => {
        it('calls next()', async () => {
            const app = createApp();

            nock(WAF_URL)
                .post('/')
                .reply(200, { action: 'allow' });

            await request(app)
                .get('/foo')
                .expect(200, 'bar');
        });
    });
});