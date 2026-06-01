Bun.build({
  entrypoints: ["./index.tsx"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  sourcemap: true,
  splitting: false,
  format: "esm",
  external: ["react", "react-dom"],
  reactFastRefresh: true,
  metafile: true,
  naming: "keep-name",
});
