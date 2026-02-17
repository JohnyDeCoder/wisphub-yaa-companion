const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';
  const isFirefox = env?.target === 'firefox';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'cheap-module-source-map',

    entry: {
      content: './src/app/content.js',
      page: './src/app/page.js',
      popup: './src/app/popup/popup.js',
      background: './src/app/background.js',
    },

    output: {
      path: path.resolve(__dirname, 'dist', isFirefox ? 'firefox' : 'chrome'),
      filename: '[name].js',
      clean: true,
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform(content) {
              const manifest = JSON.parse(content);
              if (isFirefox) {
                // Firefox MV3: replace service_worker with scripts (event page)
                const sw = manifest.background?.service_worker;
                if (sw) {
                  manifest.background = { scripts: [sw] };
                }
              } else {
                // Chrome/Edge: remove Firefox-only keys
                delete manifest.browser_specific_settings;
              }
              return JSON.stringify(manifest, null, 2);
            },
          },
          { from: 'assets', to: 'assets' },
          { from: 'src/app/popup/popup.html', to: 'popup/popup.html' },
          { from: 'src/app/popup/popup.css', to: 'popup/popup.css' },
          { from: 'src/styles/variables.css', to: 'styles/variables.css' },
          { from: 'src/styles/content.css', to: 'styles/content.css' },
        ],
      }),
    ],

    optimization: {
      minimize: isProd,
      minimizer: isProd
        ? [
            new TerserPlugin({
              extractComments: false,
              terserOptions: {
                format: { comments: false },
                compress: {
                  drop_console: false,
                  // Strip debug logs in production, keep warn/error
                  pure_funcs: ['console.log', 'console.info'],
                  passes: 2,
                },
                mangle: { safari10: true },
              },
            }),
          ]
        : [],
    },

    performance: {
      hints: isProd ? 'warning' : false,
      maxAssetSize: 300000,
      maxEntrypointSize: 300000,
    },
  };
};
