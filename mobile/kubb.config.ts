import { defineConfig } from '@kubb/core'
import { pluginClient } from '@kubb/plugin-client'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs } from '@kubb/plugin-ts'

/**
 * Same generation as the web app, from the same schema (single source of
 * truth in frontend/openapi.json — refreshed by `just codegen`).
 */
export default defineConfig({
  root: '.',
  input: {
    path: '../frontend/openapi.json',
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
      importPath: '../../lib/kubb-client',
      dataReturnType: 'data',
    }),
    pluginReactQuery({
      output: { path: 'hooks' },
      client: {
        importPath: '../../lib/kubb-client',
        dataReturnType: 'data',
      },
    }),
  ],
})
