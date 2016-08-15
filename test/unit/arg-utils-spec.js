/* jshint node:true, expr:true */
'use strict';

const _sinon = require('sinon');
const _chai = require('chai');
_chai.use(require('sinon-chai'));
_chai.use(require('chai-as-promised'));
const expect = _chai.expect;

const _path = require('path');
const _fsHelper = require('wysknd-test').fs;
const _testValueProvider = require('wysknd-test').testValueProvider;
const _rewire = require('rewire');
let _argUtils = null;

describe('[argUtils]', () => {
    const TMP_DIR = _path.resolve('.tmp');
    const _filesToCleanup = [];
    const DEFAULT_SCHEMA_PATH = _path.resolve(TMP_DIR, 'sample-schema');
    const DEFAULT_SCHEMA_OBJECT = {};
    let _ajvMock = null;
    let _ajvObj = null;

    beforeEach(() => {
        _ajvObj = {
            _schemaValidationResults: true,
            _schemaValidator: function() {}
        };
        _ajvObj._schemaValidator = _sinon.stub(_ajvObj, '_schemaValidator', () => {
            return _ajvObj._schemaValidationResults;
        });
        _ajvObj._schemaValidator.errors = null;
        _ajvObj.compile = _sinon.stub().returns(_ajvObj._schemaValidator);

        _ajvMock = _sinon.stub().returns(_ajvObj);

        _argUtils = _rewire('../../lib/arg-utils');
        _argUtils.__set__('_ajv', _ajvMock);
    });

    beforeEach(() => {
        _fsHelper.createFolders(TMP_DIR);
    });

    afterEach(() => {
        if (_filesToCleanup.length > 0) {
            _fsHelper.cleanupFiles(_filesToCleanup);
        }
        _fsHelper.cleanupFolders(TMP_DIR);

        _filesToCleanup.splice(0);
    });

    describe('buildSchemaChecker()', () => {
        beforeEach(() => {
            const filePath = DEFAULT_SCHEMA_PATH + '.json';
            _fsHelper.createFiles({
                path: filePath,
                contents: JSON.stringify(DEFAULT_SCHEMA_OBJECT)
            });
            _filesToCleanup.push(filePath);
        });

        it('should throw an error if invoked without a valid schema object', () => {
            const values = _testValueProvider.allButSelected('string', 'object');
            const error = 'Invalid schema specified (arg #1)';

            values.forEach((schema, index) => {
                const wrapper = () => {
                    _argUtils.buildSchemaChecker(schema);
                };

                expect(wrapper).to.throw(error);
            });

        });

        it('should return a function when invoked with a valid schema object/path', () => {
            const schema = DEFAULT_SCHEMA_OBJECT;
            const validator = _argUtils.buildSchemaChecker(schema);

            expect(validator).to.be.a('function');
        });

        it('should compile the specified schema object to create a schema validator', () => {
            const schema = DEFAULT_SCHEMA_OBJECT;
            expect(_ajvMock).to.not.have.been.called;
            expect(_ajvObj.compile).to.not.have.been.called;

            const validator = _argUtils.buildSchemaChecker(schema);

            expect(_ajvMock).to.have.been.calledOnce;
            expect(_ajvObj.compile).to.have.been.calledOnce;
            expect(_ajvObj.compile).to.have.been.calledWith(schema);
        });

        it('should load and compile the schema from the specified schema file if a string is specified for the schema', () => {
            const schema = DEFAULT_SCHEMA_PATH;
            expect(_ajvMock).to.not.have.been.called;
            expect(_ajvObj.compile).to.not.have.been.called;

            const validator = _argUtils.buildSchemaChecker(schema);

            expect(_ajvMock).to.have.been.calledOnce;
            expect(_ajvObj.compile).to.have.been.calledOnce;
            expect(_ajvObj.compile).to.have.been.calledWith(DEFAULT_SCHEMA_OBJECT);
        });

        describe('[schema validator behavior]', () => {
            function _buildValidator(message) {
                return _argUtils.buildSchemaChecker(DEFAULT_SCHEMA_OBJECT, message);
            }

            it('should validate the input object against the previously compiled schema', () => {
                const validator = _buildValidator();
                const target = {};

                expect(_ajvObj._schemaValidator).to.not.have.been.called;
                validator(target);
                expect(_ajvObj._schemaValidator).to.have.been.calledOnce;
                expect(_ajvObj._schemaValidator).to.have.been.calledWith(target);
            });

            it('should return false if the schema validation is successful', () => {
                const validator = _buildValidator();

                _ajvObj._schemaValidationResults = true;
                const ret = validator({});
                expect(ret).to.be.false;
            });

            it('should return an error object if schema validation fails', () => {
                const validator = _buildValidator();
                const schemaErr = {
                    dataPath: 'foo',
                    message: 'bar'
                };
                const errMessage = `Schema validation failed. Details: [${schemaErr.dataPath}: ${schemaErr.message}]`;

                _ajvObj._schemaValidationResults = false;
                _ajvObj._schemaValidator.errors = [schemaErr];
                const ret = validator({});
                expect(ret).to.be.an.instanceof(Error);
                expect(ret.message).to.equal(errMessage);
            });

            it('should use "root" instead of the schema error dataPath value if one is not specified', () => {
                const validator = _buildValidator();
                const schemaErr = {
                    message: 'bar'
                };
                const errMessage = `Schema validation failed. Details: [<root>: ${schemaErr.message}]`;

                _ajvObj._schemaValidationResults = false;
                _ajvObj._schemaValidator.errors = [schemaErr];
                const ret = validator({});
                expect(ret).to.be.an.instanceof(Error);
                expect(ret.message).to.equal(errMessage);
            });

            it('should use the custom error message if one was specified during compilation', () => {
                const customMessage = 'Something went wrong';
                const validator = _buildValidator(customMessage);
                const schemaErr = {
                    dataPath: 'foo',
                    message: 'bar'
                };
                const errMessage = `${customMessage}. Details: [${schemaErr.dataPath}: ${schemaErr.message}]`;

                _ajvObj._schemaValidationResults = false;
                _ajvObj._schemaValidator.errors = [schemaErr];
                const ret = validator({});
                expect(ret).to.be.an.instanceof(Error);
                expect(ret.message).to.equal(errMessage);
            });

        });
    });
});