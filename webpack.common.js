const path = require('path');
const webpack = require('webpack');

/*
 * We've enabled MiniCssExtractPlugin for you. This allows your app to
 * use css modules that will be moved into a separate CSS file instead of inside
 * one of your module entries!
 *
 * https://github.com/webpack-contrib/mini-css-extract-plugin
 *
 */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/*
 * We've enabled TerserPlugin for you! This minifies your app
 * in order to load faster and run less javascript.
 *
 * https://github.com/webpack-contrib/terser-webpack-plugin
 *
 */
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
// const HtmlMinimizerPlugin = require('html-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',

  entry: {
    app: path.resolve('./src/ts/app.ts'),
    style: path.resolve('./src/css/app.scss')
  },

  output: {
    path: path.resolve(__dirname, './www')
  },

  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      $: 'jquery'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/img", to: "img" },
        { from: "src/html", to: "" },
        { from: "src/openmaptiles-fonts", to: "openmaptiles-fonts" }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ],

  module: {

    rules: [{
      test: /\.(ts|tsx)$/,
      loader: 'ts-loader',
      include: [path.resolve(__dirname, 'src')],
      exclude: [/node_modules/]
    }, {
      test: /.(scss|css)$/,
      use: [{
        loader: MiniCssExtractPlugin.loader,
        options: {
          publicPath: './'
        }
      }, {
        loader: "css-loader",
        options: {
          sourceMap: true
        }
      }, {
        loader: "sass-loader",

        options: {
          sourceMap: true
        }
      }]
    },
    {
      test: /\.(woff(2)?|ttf|eot)$/,
      type: 'asset/resource',
      generator: {
        filename: './fonts/[name][ext]',
      },
    },
    {
      test: /\.(png|jpg|gif|svg)$/,
      type: 'asset/resource',
      generator: {
        filename: './image/[name][ext]',
      },
    }
    ]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      util: require.resolve("util/")
    }
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // keep_classnames: true,
          // keep_fnames: true,
          compress: {
            // drop_console: true
            pure_funcs: ['console.info', 'console.debug']
          }
        }
      }),
      new CssMinimizerPlugin(),
    ],

  }
}