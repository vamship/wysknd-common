/* jshint expr:true */
'use strict';

const _sinon = require('sinon');
const _chai = require('chai');
_chai.use(require('sinon-chai'));
_chai.use(require('chai-as-promised'));
const expect = _chai.expect;

const _rewire = require('rewire');
var _loggerProvider = null;

describe('loggerProvider', () => {
    const DEFAULT_APP_NAME = '__default_app_name__';
    var _bunyanMock;

    beforeEach(() => {
        const _loggerMock = {
            child: () => {}
        };

        _sinon.stub(_loggerMock, 'child', () => {
            return {
                trace: _sinon.spy(),
                debug: _sinon.spy(),
                info: _sinon.spy(),
                warn: _sinon.spy(),
                error: _sinon.spy(),
                fatal: _sinon.spy()
            };
        });

        _bunyanMock = {
            createLogger: () => {},
            _loggerProvider: _loggerMock
        };

        _sinon.stub(_bunyanMock, 'createLogger', () => {
            return _loggerMock;
        });

        _loggerProvider = _rewire('../../lib/logger-provider');
        _loggerProvider.__set__('_bunyan', _bunyanMock);
    });

    afterEach(() => {});

    describe('[init]', () => {
        it('should expose the necessary fields and methods', () => {
            expect(_loggerProvider).to.have.property('configure').and.to.be.a('function');
            expect(_loggerProvider).to.have.property('getLogger').and.to.be.a('function');
            expect(_loggerProvider).to.have.property('enableMock').and.to.be.a('function');
            expect(_loggerProvider).to.have.property('disableMock').and.to.be.a('function');
        });
    });

    describe('configure()', () => {
        it('should throw an error if invoked without a valid config object', () => {
            const error = 'Invalid config specified (arg #1)';

            function invoke(config) {
                return () => {
                    _loggerProvider.configure(config);
                };
            }

            expect(invoke(undefined)).to.throw(error);
            expect(invoke(null)).to.throw(error);
            expect(invoke(123)).to.throw(error);
            expect(invoke('abc')).to.throw(error);
            expect(invoke(true)).to.throw(error);
            expect(invoke([])).to.throw(error);
            expect(invoke(() => {})).to.throw(error);
        });

        it('should throw an error if the config does not define a valid app name', () => {
            const error = 'Config does not define a valid app name (config.appName)';

            function invoke(appName) {
                return () => {
                    const config = {
                        appName: appName
                    };
                    _loggerProvider.configure(config);
                };
            }

            expect(invoke(undefined)).to.throw(error);
            expect(invoke(null)).to.throw(error);
            expect(invoke(123)).to.throw(error);
            expect(invoke('')).to.throw(error);
            expect(invoke(true)).to.throw(error);
            expect(invoke([])).to.throw(error);
            expect(invoke({})).to.throw(error);
            expect(invoke(() => {})).to.throw(error);
        });

        it('should initialize the logger object when invoked', () => {
            const appName = DEFAULT_APP_NAME;
            const logLevel = 'debug';
            expect(_bunyanMock.createLogger).to.not.have.been.called;

            _loggerProvider.configure({
                appName: appName,
                logLevel: logLevel
            });

            expect(_bunyanMock.createLogger).to.have.been.calledOnce;
            expect(_bunyanMock.createLogger.args[0][0]).to.deep.equal({
                name: appName,
                streams: [{
                    stream: process.stdout,
                    level: logLevel
                }]
            });
        });

        it('should default the logLevel to "info" if the config does not specify a valid log level', () => {
            function doTest(logLevel) {
                _loggerProvider.configure({
                    appName: DEFAULT_APP_NAME,
                    logLevel: logLevel
                });
                const args = _bunyanMock.createLogger.args[0][0];
                expect(args.streams[0].level).to.equal('info');
            }

            doTest(undefined);
            doTest(null);
            doTest(123);
            doTest('');
            doTest(true);
            doTest([]);
            doTest({});
            doTest(() => {});

        });

        it('should have no impact if invoked multiple times', () => {
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            _bunyanMock.createLogger.reset();
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            expect(_bunyanMock.createLogger).to.not.have.been.called;
        });
    });

    describe('getLogger()', () => {
        it('should return a dummy logger if the logger has not been initialized', () => {
            const logger = _loggerProvider.getLogger();

            expect(logger).to.be.an('object');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((methodName) => {
                const method = logger[methodName];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });

            expect(logger.child()).to.equal(logger);
        });

        it('should throw an error if invoked without the supported logger names', () => {
            const error = 'Invalid logger name specified (arg #1)';
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            function invoke(loggerName) {
                return () => {
                    return _loggerProvider.getLogger(loggerName);
                };
            }

            expect(invoke(undefined)).to.throw(error);
            expect(invoke(null)).to.throw(error);
            expect(invoke(123)).to.throw(error);
            expect(invoke('')).to.throw(error);
            expect(invoke(true)).to.throw(error);
            expect(invoke([])).to.throw(error);
            expect(invoke({})).to.throw(error);
            expect(invoke(() => {})).to.throw(error);
        });

        it('should return a logger object when invoked with a valid logger name', () => {
            const loggerName = 'module1';
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            const logger = _loggerProvider.getLogger(loggerName);
            expect(logger).to.be.an('object');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((methodName) => {
                const method = logger[methodName];

                expect(method).to.be.a('function');
            });
        });

        it('should create a child logger with the specified logger name', () => {
            const loggerName = 'module1';
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            expect(_bunyanMock._loggerProvider.child).to.not.have.been.called;
            const logger = _loggerProvider.getLogger(loggerName);

            expect(_bunyanMock._loggerProvider.child).to.have.been.calledOnce;
            const args = _bunyanMock._loggerProvider.child.args[0][0];

            expect(args).to.deep.equal({
                group: loggerName
            });
        });

        it('should add any additional properties specified to the logger instance', () => {
            const loggerName = 'module1';
            const loggerProps = {
                foo: 'bar',
                abc: 123,
                obj: {
                    add: 'me'
                }
            };
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            expect(_bunyanMock._loggerProvider.child).to.not.have.been.called;
            const logger = _loggerProvider.getLogger(loggerName, loggerProps);

            expect(_bunyanMock._loggerProvider.child).to.have.been.calledOnce;
            const args = _bunyanMock._loggerProvider.child.args[0][0];

            const expectedArgs = {
                group: loggerName
            };
            for (let prop in loggerProps) {
                expectedArgs[prop] = loggerProps[prop];
            }
            expect(args).to.deep.equal(expectedArgs);
        });

        it('should ensure that the group property is not overridden by additional properties', () => {
            const loggerName = 'module1';
            const loggerProps = {
                group: 'this should not override the logger name'
            };
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });

            expect(_bunyanMock._loggerProvider.child).to.not.have.been.called;
            const logger = _loggerProvider.getLogger(loggerName, loggerProps);

            expect(_bunyanMock._loggerProvider.child).to.have.been.calledOnce;
            const args = _bunyanMock._loggerProvider.child.args[0][0];

            expect(args.group).to.equal(loggerName);
        });
    });

    describe('enableMock()', () => {
        it('should return a dummy logger when invoked, even if the logger was previously initialized', () => {
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });
            _loggerProvider.enableMock();
            const logger = _loggerProvider.getLogger();

            expect(logger).to.be.an('object');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((methodName) => {
                const method = logger[methodName];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
            });
        });
    });

    describe('disableMock()', () => {
        it('should disable mocking and return the configured logger object when invoked', () => {
            _loggerProvider.configure({
                appName: DEFAULT_APP_NAME
            });
            _loggerProvider.enableMock();
            let logger = _loggerProvider.getLogger();
            const loggerMethodMap = {};

            expect(logger).to.be.an('object');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((methodName) => {
                const method = logger[methodName];

                expect(method).to.be.a('function');
                expect(method()).to.be.undefined;
                loggerMethodMap[methodName] = method;
            });

            _loggerProvider.disableMock();
            logger = _loggerProvider.getLogger('module1');

            expect(logger).to.be.an('object');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((methodName) => {
                const method = logger[methodName];

                expect(method).to.be.a('function');
                expect(method).to.not.equal(loggerMethodMap[methodName]);
            });
        });
    });
});
