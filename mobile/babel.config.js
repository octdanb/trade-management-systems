module.exports = (api) => {
  api.cache(true)
  return {
    // require.resolve: preset names alone fail under pnpm's isolated
    // node_modules when babel resolves them from a different cwd (the
    // gradle-invoked export:embed runs from android/).
    presets: [
      [require.resolve('babel-preset-expo'), { jsxImportSource: 'nativewind' }],
      require.resolve('nativewind/babel'),
    ],
  }
}
