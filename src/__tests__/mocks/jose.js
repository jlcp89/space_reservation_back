// Mock implementation of the jose library for testing
// This mock must handle both CommonJS and ESM patterns

const createRemoteJWKSet = jest.fn();
const jwtVerify = jest.fn();

// Create a shared reference for the mock functions
const joseModule = {
  createRemoteJWKSet,
  jwtVerify
};

// Default mock implementations - these can be overridden per test
createRemoteJWKSet.mockReturnValue(() => Promise.resolve({}));
jwtVerify.mockResolvedValue({
  payload: {
    sub: 'mock-user-id',
    email: 'mock@test.com',
    'custom:role': 'client',
    'cognito:username': 'mockuser',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  },
  protectedHeader: {}
});

// Store original eval to restore later if needed
const originalEval = global.eval;

// Override global eval to intercept dynamic imports
global.eval = (code) => {
  if (typeof code === 'string' && code.includes('import("jose")')) {
    // Return the same module instance so jest mocks work correctly
    return Promise.resolve(joseModule);
  }
  return originalEval(code);
};

// For CommonJS require() - export the same instance
module.exports = joseModule;