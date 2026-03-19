const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const STATIC_ASSETS = [
  { from: "assets", to: "assets" },
  { from: "src/styles", to: "styles" },
  { from: "src/app/popup/popup.html", to: "popup/popup.html" },
  { from: "src/app/popup/popup.css", to: "popup/popup.css" },
  { from: "src/app/popup/changelog.json", to: "popup/changelog.json" },
  { from: "src/app/pages", to: "pages" },
];

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";
  const isFirefox = env?.target === "firefox";
  const firefoxUpdateUrl =
    env?.firefoxUpdateUrl || process.env.FIREFOX_UPDATE_URL || "";
  const outDir = path.resolve(
    __dirname,
    "dist",
    isFirefox ? "firefox" : "chrome",
  );

  return {
    mode: isProd ? "production" : "development",
    devtool: isProd ? false : "cheap-module-source-map",

    entry: {
      content: "./src/app/content.js",
      page: "./src/app/page.js",
      popup: "./src/app/popup/popup.js",
      background: "./src/app/background.js",
    },

    output: {
      path: outDir,
      filename: "[name].js",
      clean: true,
    },

    module: {
      rules: [{ test: /\.css$/, use: ["style-loader", "css-loader"] }],
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "manifest.json",
            to: "manifest.json",
            transform(content) {
              const manifest = JSON.parse(content);
              if (isFirefox) {
                const sw = manifest.background?.service_worker;
                if (sw) {
                  manifest.background = { scripts: [sw] };
                }
                if (firefoxUpdateUrl) {
                  manifest.browser_specific_settings.gecko.update_url =
                    firefoxUpdateUrl;
                } else if (manifest.browser_specific_settings?.gecko?.update_url) {
                  delete manifest.browser_specific_settings.gecko.update_url;
                }
              } else {
                delete manifest.browser_specific_settings;
              }
              if (isProd) {
                return JSON.stringify(manifest);
              }
              return JSON.stringify(manifest, null, 2);
            },
          },
          ...STATIC_ASSETS,
        ],
      }),
    ],

    optimization: {
      minimize: isProd,
      usedExports: true,
      moduleIds: isProd ? "deterministic" : "named",
      chunkIds: isProd ? "deterministic" : "named",
      minimizer: isProd
        ? [
            new TerserPlugin({
              parallel: true,
              extractComments: false,
              terserOptions: {
                format: { comments: false },
                compress: {
                  drop_console: false,
                  drop_debugger: true,
                  pure_funcs: ["console.log", "console.info"],
                  passes: 3,
                },
                mangle: { safari10: true },
              },
            }),
          ]
        : [],
    },

    cache: {
      type: "filesystem",
    },

    performance: {
      hints: isProd ? "warning" : false,
      maxAssetSize: 500_000,
      maxEntrypointSize: 300_000,
    },
  };
};
