module.exports = {
    extends: ['eslint:recommended', 'airbnb-base', 'plugin:jsdoc/recommended'],
    plugins: ['jsdoc'],
    env: {
        node: true,
        es2021: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        indent: ['error', 4],
        'comma-dangle': ['error', 'only-multiline'],
        'require-jsdoc': ['warn', {
            require: {
                FunctionDeclaration: true,
                MethodDefinition: true,
                ClassDeclaration: true,
                ArrowFunctionExpression: false,
                FunctionExpression: false,
            },
        }],
        'valid-jsdoc': ['warn', {
            requireReturn: true,
            requireParamDescription: true,
            requireReturnDescription: true,
        }],
        'spaced-comment': 'off',
        'import/extensions': ['error', 'ignorePackages', {
            js: 'always',
            mjs: 'always',
            jsx: 'always'
        }],
        'consistent-return': 'off',
    },
};
