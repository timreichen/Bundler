export function stripCssUrlSpecifier(specifier: string) {
  if (specifier.startsWith(`url(`) && specifier.endsWith(`)`)) {
    // remove round brackets and quotes from specifier ("foo/bar.css") -> foo/bar.css
    specifier = specifier.substring(4, specifier.length - 1);
  }
  if (
    (specifier.startsWith(`"`) && specifier.endsWith(`"`)) ||
    (specifier.startsWith(`'`) && specifier.endsWith(`'`))
  ) {
    // remove quotes from specifier "foo/bar.css" -> foo/bar.css
    specifier = specifier.substring(1, specifier.length - 1);
  }
  return specifier;
}
