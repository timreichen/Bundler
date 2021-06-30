# How to use

## 1. Bundle

bundle entries (`dist` is default output dir)

```sh
bundler bundle src/index.html=index.html src/image.png=image.png
```

## 2. Serve

serve `dist` as root

```sh
deno run --allow-net --allow-read https://deno.land/std@0.100.0/http/file_server.ts dist
```
