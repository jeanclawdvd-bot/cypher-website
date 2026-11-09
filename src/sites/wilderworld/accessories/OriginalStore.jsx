"use client";
// Original deployed Wilder Market presentation, recovered from the user-supplied preview.
import * as i from "react/jsx-runtime";
import * as x from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Check,
  SlidersHorizontal,
  ShoppingBag,
  Search,
  X,
  ChevronDown,
  Minus,
  Plus,
} from "lucide-react";
import styles from "./OriginalStore.module.css";
import landing from "../Landing.module.css";
import { StoreNavigation, StoreDiscovery, departments } from "./StoreBrowse";
import { individualStoreProducts } from "./fashion";
import { useDemoBag } from "./useDemoBag";
import DemoBag from "./DemoBag";
import { CollectionNavigation } from "../collections/CollectionNavigation";
const r = { default: Image },
  o = () => Link,
  w = () => styles,
  l = { A: ArrowRight },
  d = Sparkles,
  c = { A: Check },
  h = { A: SlidersHorizontal },
  p = ShoppingBag,
  u = Search,
  m = { A: X },
  g = { A: ChevronDown },
  y = Minus,
  b = Plus;
const v = individualStoreProducts;
function f(e) {
  return "$".concat((e / 100).toFixed(2 * (e % 100 != 0)));
}
/** @param {{ initialProductId?: string | null, initialCategory?: string, view?: 'overview' | 'catalog' }} props */
function S({ initialProductId = null, initialCategory = 'all', view = 'catalog' } = {}) {
  var e;
  const demoBag = useDemoBag();
  const [audience, setAudience] = x.useState("All");
  const catalogView = view === 'catalog';
  let [a, t] = (0, x.useState)(departments.some(department => department.id === initialCategory) ? initialCategory : 'all'),
    [s, n] = (0, x.useState)(""),
    [k, j] = (0, x.useState)("featured"),
    [S, M] = (0, x.useState)(() => v.find(product => product.id === initialProductId) ?? null),
    [N, C] = (0, x.useState)(() => Object.fromEntries((v.find(product => product.id === initialProductId)?.options ?? []).map(option => [option.label, option.values[0]]))),
    [colorChoices, setColorChoices] = (0, x.useState)({}),
    [editorialChoices, setEditorialChoices] = (0, x.useState)({}),
    [P, B] = (0, x.useState)(!1),
    z = (0, x.useMemo)(
      () =>
        (function (e, a) {
          let t = a.query.trim().toLocaleLowerCase();
          return [
            ...e.filter((e) => {
              let i = "all" === a.category || e.category === a.category,
                r =
                  0 === t.length ||
                  ""
                    .concat(e.name, " ")
                    .concat(e.categoryLabel, " ")
                    .concat(departments.find(department => department.id === e.category)?.label ?? "", " ")
                    .concat(e.id, " ", e.sourceSku || "", " ", e.brand || "", " ")
                    .concat(e.description)
                    .toLocaleLowerCase()
                    .includes(t);
              const fits = audience === "All" || e.gender === audience || e.gender === "Unisex";
              return i && r && fits;
            }),
          ].sort((e, t) =>
            "price-low" === a.sort
              ? e.priceCents - t.priceCents
              : "price-high" === a.sort
                ? t.priceCents - e.priceCents
                : "newest" === a.sort
                  ? Number(!!t.isNew) - Number(!!e.isNew)
                  : e.featuredRank - t.featuredRank,
          );
        })(v, { category: a, query: s, sort: k }),
      [a, s, k, audience],
    ),
    R = demoBag.count,
    q = () => {
      if (!S) return;
      demoBag.addItem({ productId: S.id, colorwayId: selectedColor?.id });
      M(null);
      B(true);
    },
    F = (e) => {
      (selectCategory(e), n(""));
      scrollToCatalog();
    };
  function selectCategory(category) {
    t(category);
    if (window.location.pathname === '/store/collections/clothing') {
      const url = new URL(window.location.href);
      if (category === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', category);
      window.history.replaceState(window.history.state, '', url);
    }
  }
  function scrollToCatalog() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('accessories')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function resetFilters() { selectCategory('all'); n(''); setAudience('All'); }
  const selectedDepartment = departments.find(department => department.id === a);
  const colorFor = product => product?.colorways?.find(color => color.id === (colorChoices[product.id] ?? product.defaultColorId)) ?? product?.colorways?.[0];
  const selectedColor = colorFor(S);
  const editorial = S?.editorials?.find(photo => photo.colorwayId === selectedColor?.id);
  const showEditorial = Boolean(editorial && editorialChoices[S?.id]);
  return (0, i.jsxs)("div", {
    className: `${w().page} ${catalogView ? styles.catalogPage : ''}`,
    children: [
      !catalogView && <section key="hero" className={landing.hero} aria-labelledby="market-heading">
        <div className={landing.frame}>
          <video className={landing.video} src="/videos/radeon-ghostline-showcase.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden />
          <div className={landing.scrim} aria-hidden />
        </div>
        <div className={landing.overlay}>
          <h1 id="market-heading" className={landing.heading}>Take a trip<br />to Wiami.</h1>
          <div className={landing.actions}>
            <Link className="sci-btn sci-btn-primary" href="#collections">Shop the collection <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>,
      !catalogView && <StoreDiscovery key="departments" />,
      catalogView && <CollectionNavigation key="collection-navigation" active="clothing" />,
      catalogView && <StoreNavigation key="store-navigation" category={a} onCategoryChange={F} query={s} onQueryChange={n} onSearchSubmit={scrollToCatalog} onOpenBag={() => B(true)} bagCount={R} />,
      catalogView && (0, i.jsxs)("section", {
        className: w().catalog,
        id: "accessories",
        "aria-label": "Shop the simulation",
        children: [
          <header key="collection-heading" className={styles.collectionHeader}>
            <div>
              <span className={styles.eyebrow}>The collection</span>
              <h1 className={landing.heading}>{a === 'all' ? 'All fashion' : selectedDepartment?.label}</h1>
            </div>
            <div className={styles.fitFilter} role="group" aria-label="Shop by gender">
              {["All", "Men", "Women"].map(label => <button key={label} type="button" aria-pressed={audience === label} onClick={() => setAudience(label)}>{label}</button>)}
            </div>
          </header>,
          <div key="catalog-controls" className={styles.catalogControls}>
            <div className={styles.catalogStatus}>
              <span className={styles.resultCount} aria-live="polite">{z.length} {z.length === 1 ? 'product' : 'products'} · USD preview prices · Color concepts</span>
              {a !== 'all' && <button type="button" className={styles.filterChip} onClick={() => selectCategory('all')} aria-label="Remove department filter">{selectedDepartment?.label}<X size={12} /></button>}
              {!!s && <button type="button" className={styles.filterChip} onClick={() => n('')} aria-label="Remove search filter">{s}<X size={12} /></button>}
              {(a !== 'all' || s || audience !== 'All') && <button type="button" className={styles.resetFilters} onClick={resetFilters}>Clear filters</button>}
            </div>
            <label className={styles.sortSelect}><span>Sort</span><select value={k} onChange={event => j(event.target.value)}>
              <option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
            </select><ChevronDown size={14} aria-hidden /></label>
          </div>,
          z.length > 0
            ? (0, i.jsx)("div", {
                className: w().productGrid,
                role: "list",
                "aria-label": "Product catalog",
                children: z.map((e) =>
                  (0, i.jsxs)(
                    "article",
                    {
                      className: w().productCard,
                      "aria-label": e.name,
                      children: [
                        (0, i.jsxs)(e.draft ? o() : "button", {
                          ...(e.draft ? { href: `/store/${e.id}${colorFor(e) ? `?color=${colorFor(e).id}` : ""}` } : { type: "button" }),
                          className: `${w().productMedia} ${e.draft ? w().isolatedMedia : ""}`,
                          onClick: e.draft ? undefined : () => {
                            var a;
                            (C(
                              Object.fromEntries(
                                (null != (a = e.options) ? a : []).map((e) => [
                                  e.label,
                                  e.values[0],
                                ]),
                              ),
                            ),
                              M(e));
                          },
                          "aria-label": (e.draft ? "View " : "Quick view ").concat(e.name),
                          children: [
                            (0, i.jsx)(r.default, {
                              src: colorFor(e)?.image ?? e.image,
                              alt: "",
                              fill: !0,
                              sizes:
                                "(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 25vw",
                              style: { objectPosition: e.imagePosition },
                            }),
                            e.badge &&
                              (0, i.jsx)("span", {
                                className: w().productBadge,
                                children: e.badge,
                              }),
                            (0, i.jsx)("span", {
                              className: w().quickView,
                              children: e.draft ? "Discover product" : "Quick view",
                            }),
                          ],
                        }),
                        (0, i.jsxs)("div", {
                          className: w().productBody,
                          children: [
                            (0, i.jsxs)("div", {
                              children: [
                                (0, i.jsx)("span", {
                                  className: w().productCategory,
                                  children: e.brand ? [e.brand, e.gender !== "Unisex" && e.gender].filter(Boolean).join(" · ") : e.categoryLabel,
                                }),
                                (0, i.jsx)("h3", { children: e.draft ? (0, i.jsx)(o(), { href: `/store/${e.id}${colorFor(e) ? `?color=${colorFor(e).id}` : ""}`, children: e.name }) : e.name }),
                              ],
                            }),
                            (0, i.jsx)("span", {
                              className: w().productPrice,
                              children: e.price,
                            }),
                          ],
                        }),
                        e.colorways?.length > 0 && (0, i.jsxs)("div", {
                          className: w().cardColors,
                          children: [
                            (0, i.jsx)("div", {
                              className: w().cardSwatches,
                              role: "group",
                              "aria-label": `${e.name} colors`,
                              children: e.colorways.map(color => (0, i.jsx)("button", {
                                type: "button",
                                title: color.name,
                                "aria-label": color.name,
                                "aria-pressed": colorFor(e)?.id === color.id,
                                className: colorFor(e)?.id === color.id ? w().cardColorSelected : "",
                                onClick: () => setColorChoices(choices => ({ ...choices, [e.id]: color.id })),
                                children: (0, i.jsx)("span", { style: { background: color.primary } }),
                              }, color.id)),
                            }),
                            (0, i.jsx)("span", { className: w().cardColorName, children: colorFor(e)?.name }),
                          ],
                        }),
                      ],
                    },
                    e.id,
                  ),
                ),
              })
            : (0, i.jsxs)("div", {
                className: w().emptyState,
                children: [
                  (0, i.jsx)("h3", { children: "No products found" }),
                  (0, i.jsx)("p", {
                    children: "Try another department or clear your search.",
                  }),
                  (0, i.jsx)("button", {
                    type: "button",
                    className: "sci-btn sci-btn-primary",
                    onClick: resetFilters,
                    children: "View all products",
                  }),
                ],
              }),
        ],
      }),
      !catalogView && (0, i.jsxs)("section", {
        className: w().editorialBanner,
        children: [
          (0, i.jsx)(r.default, {
            src: "/images/wilder-world/Wiami_Shopping.png",
            alt: "A shopping district in Wiami",
            fill: !0,
            sizes: "100vw",
          }),
          (0, i.jsx)("span", {
            className: w().editorialScrim,
            "aria-hidden": !0,
          }),
          (0, i.jsxs)("div", {
            children: [
              (0, i.jsx)("span", {
                className: w().eyebrow,
                children: "A market made for Wiami",
              }),
              (0, i.jsx)("h2", { children: "One identity. Every object." }),
              (0, i.jsx)("p", {
                children:
                  "Discover the independent labels and individual pieces shaping life in the simulation.",
              }),
            ],
          }),
        ],
      }),
      S &&
        (0, i.jsx)("div", {
          className: w().overlay,
          role: "presentation",
          onMouseDown: () => M(null),
          children: (0, i.jsxs)("section", {
            className: w().productDialog,
            role: "dialog",
            "aria-modal": "true",
            "aria-label": S.name,
            onMouseDown: (e) => e.stopPropagation(),
            children: [
              (0, i.jsx)("button", {
                type: "button",
                className: w().closeButton,
                onClick: () => M(null),
                "aria-label": "Close product",
                children: (0, i.jsx)(m.A, { size: 20, "aria-hidden": !0 }),
              }),
              (0, i.jsxs)("div", {
                className: `${w().dialogMedia} ${S.draft && !showEditorial ? w().isolatedMedia : ""} ${showEditorial ? w().editorialMedia : ""}`,
                children: [
                  (0, i.jsx)(r.default, {
                    src: showEditorial ? editorial.image : selectedColor?.image ?? S.image,
                    alt: showEditorial ? editorial.alt : S.name,
                    fill: !0,
                    priority: !0,
                    sizes: "(max-width: 800px) 100vw, 55vw",
                    style: { objectPosition: S.imagePosition },
                  }),
                  editorial && (0, i.jsx)("div", {
                    className: w().galleryViews,
                    "aria-label": "Product photography",
                    children: [false, true].map(value => (0, i.jsx)("button", {
                      type: "button",
                      "aria-pressed": showEditorial === value,
                      onClick: () => setEditorialChoices(previous => ({ ...previous, [S.id]: value })),
                      children: value ? "Editorial" : "Product",
                    }, String(value))),
                  }),
                ],
              }),
              (0, i.jsxs)("div", {
                className: w().dialogInfo,
                children: [
                  (0, i.jsx)("span", {
                    className: w().productCategory,
                    children: S.brand ? `${S.brand} / ${S.categoryLabel}` : S.categoryLabel,
                  }),
                  (0, i.jsx)("h2", { children: S.name }),
                  S.draft && (0, i.jsx)("p", {
                    className: w().productSku,
                    children: S.sourceSku,
                  }),
                  (0, i.jsx)("p", {
                    className: w().dialogDescription,
                    children: S.description,
                  }),
                  (0, i.jsx)("strong", {
                    className: w().dialogPrice,
                    children: S.price,
                  }),
                  S.colorways?.length > 0 && (0, i.jsxs)("fieldset", {
                    className: w().colorways,
                    "aria-label": "Color",
                    children: [
                      (0, i.jsxs)("legend", { children: ["Color — ", (0, i.jsx)("span", { children: selectedColor?.name })] }),
                      (0, i.jsx)("div", { children: S.colorways.map(color => (0, i.jsx)("button", {
                        type: "button",
                        "aria-label": color.name,
                        "aria-pressed": selectedColor?.id === color.id,
                        title: color.name,
                        className: selectedColor?.id === color.id ? w().colorSelected : undefined,
                        onClick: () => {
                          setColorChoices(previous => ({ ...previous, [S.id]: color.id }));
                          setEditorialChoices(previous => ({ ...previous, [S.id]: false }));
                        },
                        children: (0, i.jsx)("span", { style: { background: color.primary }, "aria-hidden": true }),
                      }, color.id)) }),
                    ],
                  }),
                  (null != (e = S.options) ? e : []).map((e) =>
                    (0, i.jsxs)(
                      "fieldset",
                      {
                        className: w().optionGroup,
                        children: [
                          (0, i.jsx)("legend", { children: e.label }),
                          e.values.length > 6 ? (0, i.jsx)("select", {
                            className: w().configurationSelect,
                            "aria-label": e.label,
                            value: N[e.label] ?? e.values[0],
                            onChange: (event) => C((t) => ({ ...t, [e.label]: event.target.value })),
                            children: e.values.map((value) => (0, i.jsx)("option", { value, children: value }, value)),
                          }) : (0, i.jsx)("div", {
                            children: e.values.map((a) =>
                              (0, i.jsx)(
                                "button",
                                {
                                  type: "button",
                                  className:
                                    N[e.label] === a
                                      ? w().optionActive
                                      : void 0,
                                  onClick: () =>
                                    C((t) => ({ ...t, [e.label]: a })),
                                  "aria-pressed": N[e.label] === a,
                                  children: a,
                                },
                                a,
                              ),
                            ),
                          }),
                        ],
                      },
                      e.label,
                    ),
                  ),
                  (0, i.jsx)("ul", {
                    className: w().detailList,
                    children: S.details.map((e) =>
                      (0, i.jsxs)(
                        "li",
                        {
                          children: [
                            (0, i.jsx)(c.A, { size: 14, "aria-hidden": !0 }),
                            e,
                          ],
                        },
                        e,
                      ),
                    ),
                  }),
                  S.lore && (0, i.jsxs)("details", {
                    className: w().productStory,
                    children: [
                      (0, i.jsx)("summary", { children: "The story" }),
                      (0, i.jsx)("p", { children: S.lore }),
                    ],
                  }),
                  S.liveHref
                    ? (0, i.jsxs)("div", {
                        className: w().dialogActions,
                        children: [
                          (0, i.jsxs)(o(), {
                            href: S.liveHref,
                            className: "sci-btn sci-btn-primary",
                            children: [
                              "View live offer ",
                              (0, i.jsx)(l.A, { size: 16, "aria-hidden": !0 }),
                            ],
                          }),
                          (0, i.jsx)("button", {
                            type: "button",
                            className: w().secondaryButton,
                            onClick: q,
                            children: "Add to demo bag",
                          }),
                        ],
                      })
                    : (0, i.jsxs)("button", {
                        type: "button",
                        className: "sci-btn sci-btn-primary ".concat(
                          w().fullButton,
                        ),
                        onClick: q,
                        children: [
                          "Add to bag ",
                          (0, i.jsx)(p, { size: 16, "aria-hidden": !0 }),
                        ],
                      }),
                  ("Demo" === S.badge || S.draft) &&
                    (0, i.jsx)("p", {
                      className: w().demoNote,
                      children:
                        "Preview collection. No payment is taken.",
                    }),
                ],
              }),
            ],
          }),
        }),
      (0, i.jsx)(DemoBag, { open: P, onClose: () => B(false) }),
    ],
  });
}
export default S;
