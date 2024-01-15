// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    postgresUser: process.env.NUXT_POSTGRES_USER,
    postgresPassword: process.env.NUXT_POSTGRES_PASSWORD,
    postgresDb: process.env.NUXT_POSTGRES_DB,
    postgresPort: process.env.NUXT_POSTGRES_PORT,
    postgresHost: process.env.NUXT_POSTGRES_HOST,
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
})
