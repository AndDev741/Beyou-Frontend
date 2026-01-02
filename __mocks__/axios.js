const mockAxios = {
  // Reuse the same mock instance for axios.create calls
  create: jest.fn(() => mockAxios),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  isAxiosError: (error) => Boolean(error && error.isAxiosError),
};

module.exports = mockAxios;
module.exports.default = mockAxios;
