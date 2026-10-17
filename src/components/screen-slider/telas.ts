/* As 5 telas da secao Exploration do Liv Up, cada uma com o texto do passo
   a que pertence. Compartilhado pelas versoes do slider. */
import favorites from "../../assets/cases/liv-up/favorites.png";
import inlineRecs from "../../assets/cases/liv-up/inline-recommendations.png";
import listEmpty from "../../assets/cases/liv-up/list-empty-state.png";
import listShortcuts from "../../assets/cases/liv-up/list-shortcuts.png";
import listSearch from "../../assets/cases/liv-up/list-search.png";

export const telas = [
  {
    src: favorites,
    alt: "Favorites page listing saved items with a Since you enjoyed suggestion block",
    heading: "At first we explored a Favorites page",
    text: [
      "It gave users a place to save regular buys, with new items alongside. But a page built around past purchases reinforced the tunnel vision we were trying to break, and new items felt out of place.",
    ],
  },
  {
    src: inlineRecs,
    alt: "Recommendations placed inline, next to the item they relate to",
    heading: "Tried moving the position of recommendations",
    text: [
      "Instead of a generic section at the bottom, recommendations now sat inline, next to the item they related to. Someone who always bought a chicken dish would see a new protein suggested right beside it.",
    ],
  },
  {
    src: listEmpty,
    alt: "Shopping list empty state, seeded with items from past orders",
    heading: "Then pivoted to a shopping list that encourages the discovery of new products",
    text: [
      "We renamed the section from “Favorites” to “Shopping list”, shifting the mindset from “things I like” to “things I'm going to buy”. An empty list now starts seeded with items from past orders, not a blank screen.",
    ],
  },
  {
    src: listShortcuts,
    alt: "Shopping list with discovery shortcuts above the items",
    heading: "Added shortcuts to help navigating",
    text: [
      "Discovery shortcuts (New arrivals, Recommended, Previously bought, Best reviewed) gave users clear paths into the new catalog without forcing them to explore.",
    ],
  },
  {
    src: listSearch,
    alt: "Shopping list with search to add items without leaving the page",
    heading: "At last, we added a search field",
    text: [
      "Users could find items for their shopping list or cart without leaving the page, streamlining the whole experience.",
    ],
  },
];

/* Os 4 espacos da fila. Quem esta no destaque sai da fila, entao sempre
   sobram 4 telas para 4 espacos. */
export const espacos = [0, 1, 2, 3];
