# How to use

## 1. Bundle

bundle entries

```sh
bundler bundle src/index.html=index.html src/a.ts=a.js src/b.ts=b.js
```

## 2. Serve

serve `dist` as root

```sh
deno run --allow-net --allow-read https://deno.land/std@0.97.0/http/file_server.ts dist
```
