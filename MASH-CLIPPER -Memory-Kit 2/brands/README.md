# Brands

One folder per client or brand. The kit reads `~/.claude/motion-kit/brands/<client>/brand.json` (via `/motion-theme`) and uses it for every
colour, font, logo and card in that client's videos. Your own channel can have a folder too.

```
brands/
  acme-coffee/
    brand.json        colours, fonts, card + caption style, rules
    logo.png          (and logo-white.png, icon.png ...)
    fonts/            licensed font files if the brand needs non-Google fonts
    examples/         screenshots of their existing cards, thumbnails, past videos
```

Copy `_template/brand.json`, fill it from the client's guidelines, and keep it private (client data never goes into
a shared copy of this kit). If a client already has a brand-kit skill installed, that skill wins; `brand.json` is
the fallback.
