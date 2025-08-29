// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/pavan.patchikarla/Desktop/Code/exp/chatui/moegenie/node_modules/.pnpm/vite@5.4.19_@types+node@24.2.0_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/pavan.patchikarla/Desktop/Code/exp/chatui/moegenie/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.19_@types+node@24.2.0_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///Users/pavan.patchikarla/Desktop/Code/exp/chatui/moegenie/node_modules/.pnpm/@tailwindcss+vite@4.1.11_vite@5.4.19_@types+node@24.2.0_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/Users/pavan.patchikarla/Desktop/Code/exp/chatui/moegenie";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const hmrHost = env.VITE_HMR_HOST || void 0;
  const hmrProtocol = env.VITE_HMR_PROTOCOL || (env.HTTPS ? "wss" : "ws");
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT ? parseInt(env.VITE_HMR_CLIENT_PORT, 10) : void 0;
  const hmrPort = env.VITE_HMR_PORT ? parseInt(env.VITE_HMR_PORT, 10) : void 0;
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    server: {
      cors: true,
      hmr: hmrHost ? {
        host: hmrHost,
        protocol: hmrProtocol,
        clientPort: hmrClientPort,
        port: hmrPort
      } : void 0,
      proxy: {
        "/api/zendesk": {
          target: "https://moengage.zendesk.com",
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api\/zendesk/, "/api/v2"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Origin", "https://moengage.zendesk.com");
              proxyReq.setHeader("Referer", "https://moengage.zendesk.com/");
            });
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcGF2YW4ucGF0Y2hpa2FybGEvRGVza3RvcC9Db2RlL2V4cC9jaGF0dWkvbW9lZ2VuaWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9wYXZhbi5wYXRjaGlrYXJsYS9EZXNrdG9wL0NvZGUvZXhwL2NoYXR1aS9tb2VnZW5pZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvcGF2YW4ucGF0Y2hpa2FybGEvRGVza3RvcC9Db2RlL2V4cC9jaGF0dWkvbW9lZ2VuaWUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIlxuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG5cbiAgY29uc3QgaG1ySG9zdCA9IGVudi5WSVRFX0hNUl9IT1NUIHx8IHVuZGVmaW5lZDtcbiAgY29uc3QgaG1yUHJvdG9jb2wgPSAoZW52LlZJVEVfSE1SX1BST1RPQ09MIGFzICd3cycgfCAnd3NzJykgfHwgKGVudi5IVFRQUyA/ICd3c3MnIDogJ3dzJyk7XG4gIGNvbnN0IGhtckNsaWVudFBvcnQgPSBlbnYuVklURV9ITVJfQ0xJRU5UX1BPUlQgPyBwYXJzZUludChlbnYuVklURV9ITVJfQ0xJRU5UX1BPUlQsIDEwKSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgaG1yUG9ydCA9IGVudi5WSVRFX0hNUl9QT1JUID8gcGFyc2VJbnQoZW52LlZJVEVfSE1SX1BPUlQsIDEwKSA6IHVuZGVmaW5lZDtcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGNvcnM6IHRydWUsXG4gICAgICBobXI6IGhtckhvc3QgPyB7XG4gICAgICAgIGhvc3Q6IGhtckhvc3QsXG4gICAgICAgIHByb3RvY29sOiBobXJQcm90b2NvbCxcbiAgICAgICAgY2xpZW50UG9ydDogaG1yQ2xpZW50UG9ydCxcbiAgICAgICAgcG9ydDogaG1yUG9ydCxcbiAgICAgIH0gOiB1bmRlZmluZWQsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaS96ZW5kZXNrJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHBzOi8vbW9lbmdhZ2UuemVuZGVzay5jb20nLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvemVuZGVzay8sICcvYXBpL3YyJyksXG4gICAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcbiAgICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSkgPT4ge1xuICAgICAgICAgICAgICAvLyBBZGQgQ09SUyBoZWFkZXJzXG4gICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignT3JpZ2luJywgJ2h0dHBzOi8vbW9lbmdhZ2UuemVuZGVzay5jb20nKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdSZWZlcmVyJywgJ2h0dHBzOi8vbW9lbmdhZ2UuemVuZGVzay5jb20vJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2VixTQUFTLGNBQWMsZUFBZTtBQUNuWSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUUzQyxRQUFNLFVBQVUsSUFBSSxpQkFBaUI7QUFDckMsUUFBTSxjQUFlLElBQUksc0JBQXVDLElBQUksUUFBUSxRQUFRO0FBQ3BGLFFBQU0sZ0JBQWdCLElBQUksdUJBQXVCLFNBQVMsSUFBSSxzQkFBc0IsRUFBRSxJQUFJO0FBQzFGLFFBQU0sVUFBVSxJQUFJLGdCQUFnQixTQUFTLElBQUksZUFBZSxFQUFFLElBQUk7QUFFdEUsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7QUFBQSxJQUNoQyxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixLQUFLLFVBQVU7QUFBQSxRQUNiLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLE1BQU07QUFBQSxNQUNSLElBQUk7QUFBQSxNQUNKLE9BQU87QUFBQSxRQUNMLGdCQUFnQjtBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsbUJBQW1CLFNBQVM7QUFBQSxVQUM1RCxXQUFXLENBQUMsVUFBVTtBQUNwQixrQkFBTSxHQUFHLFlBQVksQ0FBQyxhQUFhO0FBRWpDLHVCQUFTLFVBQVUsVUFBVSw4QkFBOEI7QUFDM0QsdUJBQVMsVUFBVSxXQUFXLCtCQUErQjtBQUFBLFlBQy9ELENBQUM7QUFBQSxVQUNIO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
