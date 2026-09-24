/**
 * Uma raiz do DialKit por pagina. Os paineis do CRT e do lightbox podem
 * estar na mesma pagina (nos cases, com ?calibrate) e o DialKit pede uma
 * raiz so, com os paineis empilhados dentro dela.
 */
import { createDialRoot } from "dialkit/vanilla";
import "dialkit/vanilla/styles.css";

let raiz: ReturnType<typeof createDialRoot> | null = null;

export function dialRoot() {
  return (raiz ??= createDialRoot({ position: "top-right", theme: "dark" }));
}
