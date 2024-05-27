/**
 * Creates a binary string from the given octet.
 */
export function toBinary(octets: [number, number, number, number]): string {
  return octets.map((octet) => octet.toString(2)).join(' ')
}
