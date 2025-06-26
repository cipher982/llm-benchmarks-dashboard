const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Optimize chunk splitting for better caching and loading
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate Material-UI into its own chunk
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              chunks: 'all',
              priority: 20,
            },
            // Separate chart libraries (recharts, d3) into their own chunk
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3|d3-.*)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 30,
            },
            // Separate React ecosystem
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 40,
            },
            // Common chunk for frequently used utilities
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
      };

      return webpackConfig;
    },
  },
};