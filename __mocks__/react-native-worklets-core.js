module.exports = {
  Worklets: {
    createRunOnJS: jest.fn((fn) => fn),
    createRunInContextFn: jest.fn((fn) => fn),
  },
  useSharedValue: jest.fn((value) => ({ value })),
};
