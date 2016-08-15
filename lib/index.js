/* jshint node:true, expr:true */
'use strict';


module.exports = {
    /**
     * Wrapper that generates logger objects with predefined metadata tags. Can
     * be configured once in the app, and used to derive child loggers with
     * metadata built in.
     */
    loggerProvider: require('./logger-provider'),

    /**
     * Utility class that provides functionality around argument validation.
     */
    argUtils: require('./arg-utils')
};
