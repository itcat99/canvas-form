const webpack = require("webpack");
const config = require("../config");
const common = require("./webpack.common");
const htmlPlugin = require("html-webpack-plugin");

const port = process.env.NODE_PORT || 3000;

const dev = {
  entry: Object.assign({}, common.entry, { mock: `${config.mock}/mocks.js` }),
  mode: "development",
  devtool: "source-map",
  devServer: {
    host: "0.0.0.0",
    hot: true,
    port,
    contentBase: common.output.publicPath,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new htmlPlugin({
      title: "dev mode",
      template: config.template,
    }),
  ],
};

module.exports = Object.assign({}, common, dev);
