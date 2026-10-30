export function withDxVersionLabels(version) {
  return {
    ...version,
    name: version.name.replaceAll('\u3067\u3089\u3063\u304f\u3059', 'DX'),
    shortName: version.shortName.replaceAll('\u3067\u3089\u3063\u304f\u3059', 'DX'),
  };
}
