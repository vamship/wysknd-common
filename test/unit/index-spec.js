/* jshint node:true, expr:true */
'use strict';

var _sinon = require('sinon');
var _chai = require('chai');
_chai.use(require('sinon-chai'));
_chai.use(require('chai-as-promised'));
var expect = _chai.expect;

var _index = require('../../lib/index');

describe('index', function() {
    it('should implement methods required by the interface', function() {
        expect(_index.loggerProvider).to.be.an('object');
        expect(_index.argUtils).to.be.an('object');
    });

    it('should return the correct object for logger provider', function() {
        expect(_index.loggerProvider).to.equal(require('../../lib/logger-provider'));
    });

    it('should return the correct object for logger provider', function() {
        expect(_index.argUtils).to.equal(require('../../lib/arg-utils'));
    });
});
