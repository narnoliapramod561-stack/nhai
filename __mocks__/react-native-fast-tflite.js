module.exports = {
  useTensorflowModel: jest.fn(() => ({
    state: 'loaded',
    model: {
      run: jest.fn(async () => []),
      runSync: jest.fn(() => []),
    },
  })),
};
