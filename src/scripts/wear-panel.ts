/**
 * Painel do desgaste das lombadas VHS, em DialKit. Montado pelo /vhs-lab.
 * Reescreve as custom properties de cada .spine-box, que a VhsSpine ja
 * preenche no build a partir de wear-config.ts.
 */
import { createDialKit } from "dialkit/vanilla";
import { dialRoot } from "./dial-root";
import { WEAR, wearVars, type WearConfig } from "./wear-config";

export function mountWearPanel() {
  dialRoot();

  const kit = createDialKit(
    "Desgaste das fitas",
    {
      minimo: [WEAR.minimo, 0, 1, 0.05],
      desbotar: [WEAR.desbotar, 0, 1, 0.01],
      escurecer: [WEAR.escurecer, 0, 0.5, 0.01],
      arranhoes: [WEAR.arranhoes, 0, 1, 0.05],
      tamanho: [WEAR.tamanho, 0, 80, 1],
      texturaNova: [WEAR.texturaNova, 0, 1, 0.01],
      texturaVelha: [WEAR.texturaVelha, 0, 1, 0.01],
      encardido: [WEAR.encardido, 0, 1, 0.01],
      quinas: [WEAR.quinas, 0, 12, 0.5],
    },
    { id: "vhs-desgaste", persist: true }
  );

  const parar = kit.subscribe((v: any) => {
    const vars = wearVars(v as WearConfig);
    for (const caixa of document.querySelectorAll<HTMLElement>(".spine-box")) {
      for (const [k, val] of Object.entries(vars)) caixa.style.setProperty(k, val);
    }
  });

  return () => {
    parar();
    kit.destroy();
  };
}
