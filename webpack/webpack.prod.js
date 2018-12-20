const common = require("./webpack.common");

const prod = {
  mode: "production",
};

module.exports = Object.assign({}, common, prod);
