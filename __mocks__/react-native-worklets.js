module.exports = {
  scheduleOnRN: jest.fn((fn, ...args) => fn(...args)),
  runOnJS: jest.fn((fn) => fn),
};
