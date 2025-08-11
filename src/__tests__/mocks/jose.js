// Mock implementation of the jose library for testing
module.exports = {
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn()
};