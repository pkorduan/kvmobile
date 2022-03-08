const path = require('path');
const webpack = require('webpack');


const TerserPlugin = require('terser-webpack-plugin');


module.exports = {
  mode: 'development',

  entry: {
    app:path.resolve('./src/ts/app.ts')
  },

  output: {
    path: path.resolve(__dirname, './www/js')  
  },

  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      $: 'jquery'
    }),
  ],

  module: {

    rules: [{
      test: /\.(ts|tsx)$/,
      loader: 'ts-loader',
      include: [path.resolve(__dirname, 'src')],
      exclude: [/node_modules/]
    }]
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
              pure_funcs: [ 'console.info', 'console.debug' ]
            }
        }
      }),       
    ],

 }
}