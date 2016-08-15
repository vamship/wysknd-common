'use strict';

const EMPTY_FUNC = function() {};
const MOCK_LOGGER = {
    trace: EMPTY_FUNC,
    debug: EMPTY_FUNC,
    info: EMPTY_FUNC,
    warn: EMPTY_FUNC,
    error: EMPTY_FUNC,
    fatal: EMPTY_FUNC,
    child: function() {
        return MOCK_LOGGER;
    }
};
// This needs to be a "let" because tests mock out this parameter using rewire.
const _clone = require('clone');
let _bunyan = require('bunyan');

let _isInitialized = false;
let _isMockEnabled = false;
let _logger = null;

/**
 * Module that provides pre configured loggers for use in other application
 * modules.
 */
module.exports = {

    /**
     * Forces the logger provider to generate mock loggers that do not
     * perform any real logging. This method is primarily intended for
     * debugging/testing purposes where log messages may have to be suppressed.
     */
    enableMock: function() {
        _isMockEnabled = true;
    },

    /**
     * Disables any mock logging that may have been enforced by the use of
     * enableMock() This method is primarily intended for debugging/testing
     * purposes.
     */
    disableMock: function() {
        _isMockEnabled = false;
    },

    /**
     * Configures global logger settings. This method should be invoked before
     * any calls to getLogger().
     *
     * @module loggerProvider
     * @param {Object} config An object that defines configuration parameters
     *        for the logger
     */
    configure: function(config) {
        if (!config || config instanceof Array || typeof config !== 'object') {
            throw new Error('Invalid config specified (arg #1)');
        }
        if (typeof config.appName !== 'string' || config.appName.length <= 0) {
            throw new Error('Config does not define a valid app name (config.appName)');
        }
        if (_isInitialized) {
            // Already initialized. Do nothing.
            return;
        }

        let logLevel = config.logLevel;
        if (typeof logLevel !== 'string' || logLevel.length <= 0) {
            logLevel = 'info';
        }

        _logger = _bunyan.createLogger({
            name: config.appName,
            streams: [{
                stream: process.stdout,
                level: logLevel
            }]
        });

        _isInitialized = true;
    },

    /**
     * Returns a preconfigured logger for the specified module.
     *
     * @module loggerProvider
     * @param {String} name The name of the module for which the logger will
     *        be returned.
     * @param {Object} [props={}] Optional properties to be added to the logger
     *         instance.
     * @return {Object} A logger object that can be used for logging. If not
     *         configured, this object will be a mock object that supports
     *         the logging methods, but does not actually perform any logging.
     */
    getLogger: function(name, props) {
        if (!_isInitialized || _isMockEnabled) {
            return MOCK_LOGGER;
        }
        if (typeof name !== 'string' || name.length <= 0) {
            throw new Error('Invalid logger name specified (arg #1)');
        }
        if (!props || typeof props !== 'object') {
            props = {};
        }
        const loggerProps = _clone(props);
        loggerProps.group = name;

        return _logger.child(loggerProps);
    }
};
