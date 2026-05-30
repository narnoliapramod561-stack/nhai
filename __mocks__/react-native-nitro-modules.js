module.exports = {
  NitroModules: {
    box(value) {
      return {
        unbox() {
          return value;
        },
      };
    },
  },
};
