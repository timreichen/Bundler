export function walkAll(node: any, callback: (node: any) => any) {
  const content = node.content;
  if (content) {
    for (const item of content) {
      if (item instanceof Object && item.tag) {
        walkAll(item, callback);
      }
    }
  }
  callback(node);
  return node;
}
