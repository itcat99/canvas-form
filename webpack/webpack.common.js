const config = require("../config");

module.exports = {
  entry: {
    main: config.dev + "/index.js",
  },
  output: {
    path: config.target,
    filename: "[name].js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: ["babel-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".json"],
  },
};
