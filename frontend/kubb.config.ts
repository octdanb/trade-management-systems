import { defineConfig } from '@kubb/core'
import { pluginClient } from '@kubb/plugin-client'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs } from '@kubb/plugin-ts'

/**
 * Generates a typed axios client + TanStack Query hooks from the django-ninja
 * OpenAPI schema. Regenerate with `just codegen` (exports ./openapi.json from
 * the backend, then runs kubb).
 */
export default defineConfig({
  root: '.',
  input: {
    path: './openapi.json',
  },
  output: {
    path: './src/gen',
    clean: true,
  },
  plugins: [
    pluginOas({ validate: true, generators: [] }),
    pluginTs({
      output: { path: 'types' },
    }),
    pluginClient({
      output: { path: 'clients' },
      importPath: '@/lib/kubb-client',
      dataReturnType: 'data',
    }),
    pluginReactQuery({
      output: { path: 'hooks' },
      client: {
        importPath: '@/lib/kubb-client',
        dataReturnType: 'data',
      },
    }),
  ],
})
