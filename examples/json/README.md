# How to use

## 1. Bundle

bundle entry `src/index.html` to output `index.html` (`dist` is default output
dir)

```sh
bundler bundle src/index.html=index.html
```

## 2. Serve

serve `dist` as root

```sh
deno run --allow-net --allow-read https://deno.land/std@0.97.0/http/file_server.ts dist
```
