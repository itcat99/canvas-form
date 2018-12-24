const path = require("path");

module.exports = {
  dev: path.resolve(__dirname, "src"),
  target: path.resolve(__dirname, "dist"),
  template: path.resolve(__dirname, "webpack", "index.temp.html"),
  mock: path.resolve(__dirname, "src"),
};
