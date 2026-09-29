"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  getCategoriesApi,
  getWishlistApi,
  getProductsApi,
  BASE_URL,
} from "@/lib/api";
import {
  collectVariantsForPdp,
  extractPdpHeroTitleFromVariant,
} from "@/lib/productVariants";
import { toast } from "react-toastify";
import { getUserToken, clearUserSession, USER_SESSION_EXPIRED_EVENT } from "@/lib/authSession";

const logo = "/assets/home/logo.jpg";

const catMenuShellClass =
  "relative overflow-visible rounded-2xl border border-gray-200/70 bg-white shadow-[0_10px_44px_-8px_rgba(0,0,0,0.11),0_2px_8px_-2px_rgba(255,107,0,0.06)] ring-1 ring-orange-100/50";

const catMenuPanelClass =
  "overflow-visible rounded-2xl border border-gray-200/75 bg-white py-1.5 shadow-[0_14px_52px_-12px_rgba(0,0,0,0.13),0_4px_22px_-6px_rgba(255,107,0,0.09)] ring-1 ring-orange-200/40";

const catRowLinkClass =
  "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-orange-50/95 hover:text-orange-600";

const catThumbClass =
  "shrink-0 rounded-lg border border-gray-100/90 bg-white object-contain shadow-sm ring-1 ring-black/[0.04]";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);

    update();
    mq.addEventListener("change", update);

    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function compareCategoriesOldestFirst(a, b) {
  const aTime = Date.parse(a?.createdAt ?? a?.created_at ?? "");
  const bTime = Date.parse(b?.createdAt ?? b?.created_at ?? "");
  const aHasTime = Number.isFinite(aTime);
  const bHasTime = Number.isFinite(bTime);

  if (aHasTime && bHasTime && aTime !== bTime) return aTime - bTime;
  if (aHasTime && !bHasTime) return -1;
  if (!aHasTime && bHasTime) return 1;

  const aId = Number(a?.id);
  const bId = Number(b?.id);
  const aHasId = Number.isFinite(aId);
  const bHasId = Number.isFinite(bId);

  if (aHasId && bHasId && aId !== bId) return aId - bId;
  if (aHasId && !bHasId) return -1;
  if (!aHasId && bHasId) return 1;

  return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function buildCategoryTree(all) {
  const list = Array.isArray(all) ? all : [];
  const byId = new Map();
  const roots = [];

  list.forEach((cat) => {
    byId.set(String(cat.id), { ...cat, subcategories: [] });
  });

  byId.forEach((node) => {
    const rawPid =
      node.parent_id ??
      node.parentId ??
      node.ParentId ??
      node.parent_category_id ??
      node.parentCategoryId;

    const pid =
      rawPid === "" || rawPid === undefined || rawPid === null
        ? null
        : rawPid;

    const pKey = pid == null ? null : String(pid);

    if (pKey && byId.has(pKey)) {
      byId.get(pKey).subcategories.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes) => {
    nodes.sort(compareCategoriesOldestFirst);
    nodes.forEach((n) => sortRec(n.subcategories));
  };

  sortRec(roots);
  return roots;
}

function collectCategoryNamesDeep(nodes, acc = []) {
  for (const n of nodes || []) {
    if (n?.name) acc.push(String(n.name).trim());
    collectCategoryNamesDeep(n.subcategories, acc);
  }

  return acc;
}

function extractProductRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const candidates = [
    payload.data,
    payload.products,
    payload.items,
    payload.rows,
    payload.product,
  ];

  for (const candidate of candidates) {
    const rows = extractProductRows(candidate);
    if (rows.length) return rows;
  }

  return [];
}

function extractPaginationMeta(payload) {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [payload, payload.data, payload.pagination, payload.meta];

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;

    const page = Number(item.page ?? item.currentPage ?? item.current_page);
    const totalPages = Number(
      item.totalPages ?? item.total_pages ?? item.lastPage
    );
    const limit = Number(item.limit ?? item.perPage ?? item.per_page);

    if (
      Number.isFinite(page) ||
      Number.isFinite(totalPages) ||
      Number.isFinite(limit)
    ) {
      return {
        page: Number.isFinite(page) ? page : null,
        totalPages: Number.isFinite(totalPages) ? totalPages : null,
        limit: Number.isFinite(limit) ? limit : null,
      };
    }
  }

  return null;
}

function normalizeSearchString(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapProductEntity(product) {
  if (!product || typeof product !== "object") return null;
  return product.Product ?? product.product ?? product;
}

/** Prefers the SEO slug for the product URL, falling back to the numeric id for older data. */
function getProductRouteId(product) {
  const entity = unwrapProductEntity(product);

  if (!entity || typeof entity !== "object") return null;

  return (
    entity.slug ??
    entity.id ??
    entity.product_id ??
    entity.productId ??
    entity.ProductId ??
    null
  );
}

function buildProductSearchBlob(product) {
  const entity = unwrapProductEntity(product);

  if (!entity || typeof entity !== "object") return "";

  const parts = [];
  const name = String(entity.name ?? "").trim();

  if (name) parts.push(name);

  const variants = collectVariantsForPdp(entity);

  for (const variant of variants) {
    const heading = extractPdpHeroTitleFromVariant(variant);
    if (heading) parts.push(heading);
  }

  return normalizeSearchString(parts.join(" "));
}

function CategorySubmenuRow({
  node,
  rootName,
  onNavigate,
  depth = 0,
  isDesktop,
}) {
  const subs = node.subcategories ?? [];
  const hasKids = subs.length > 0;
  const [open, setOpen] = useState(false);

  const shopUrl =
    node.name === rootName
      ? `/shop?category=${encodeURIComponent(rootName)}`
      : `/shop?category=${encodeURIComponent(
          rootName
        )}&subCategory=${encodeURIComponent(node.name)}`;

  const toggleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const rowContent = (
    <div className="group flex w-full min-w-0 cursor-pointer items-stretch select-none">
      {hasKids ? (
        <button
          type="button"
          onClick={toggleOpen}
          className={`${catRowLinkClass} flex-1 bg-transparent`}
        >
          {node.image && String(node.image).trim() !== "" ? (
            <img
              src={`${BASE_URL}/uploads/${node.image}`}
              alt=""
              className={`h-7 w-7 ${catThumbClass}`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}

          <span className="min-w-0 flex-1 truncate">{node.name}</span>
        </button>
      ) : (
        <Link
          href={shopUrl}
          onClick={onNavigate}
          className={`${catRowLinkClass} flex-1`}
        >
          {node.image && String(node.image).trim() !== "" ? (
            <img
              src={`${BASE_URL}/uploads/${node.image}`}
              alt=""
              className={`h-7 w-7 ${catThumbClass}`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}

          <span className="min-w-0 flex-1 truncate">{node.name}</span>
        </Link>
      )}

      {hasKids ? (
        <button
          type="button"
          onClick={toggleOpen}
          className="inline-flex min-h-[40px] min-w-[42px] shrink-0 items-center justify-center rounded-r-lg bg-transparent text-gray-400/90 transition-colors group-hover:bg-orange-50/90 group-hover:text-orange-600"
          aria-expanded={open}
        >
          <i
            className={`fa-solid ${
              isDesktop ? "fa-angle-right" : "fa-angle-down"
            } pointer-events-none text-xs opacity-85 transition-transform ${
              !isDesktop && open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : null}
    </div>
  );

  if (!hasKids) {
    return (
      <div className="border-b border-gray-100/75 last:border-b-0">
        {rowContent}
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="border-b border-gray-100/75 last:border-b-0">
        {rowContent}

        {open && (
          <div className="ml-3 border-l border-orange-100 bg-white pl-2">
            {subs.map((child) => (
              <CategorySubmenuRow
                key={child.id}
                node={child}
                rootName={rootName}
                onNavigate={onNavigate}
                depth={depth + 1}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-w-0 border-b border-gray-100/75 last:border-b-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {rowContent}

      {open && (
        <div
          className={`absolute left-full top-0 ml-1 w-max min-w-[220px] max-w-[280px] ${catMenuPanelClass}`}
          style={{ zIndex: 999 + depth }}
        >
          {subs.map((child) => (
            <CategorySubmenuRow
              key={child.id}
              node={child}
              rootName={rootName}
              onNavigate={onNavigate}
              depth={depth + 1}
              isDesktop={isDesktop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AllCategoriesFlyout({ roots, onNavigate }) {
  const isDesktop = useIsDesktop();
  const [openRootId, setOpenRootId] = useState(null);
  const [flyoutPos, setFlyoutPos] = useState({
    top: 0,
    left: 0,
  });

  const leaveTimerRef = useRef(null);
  const rowElRef = useRef({});

  const clearCloseTimer = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const syncFlyoutPosition = (nodeId) => {
    const el = rowElRef.current[nodeId];

    if (!el) return;

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = 280;
    const panelH = Math.min(420, vh - 16);

    let left = r.right - 8;
    let top = r.bottom;

    if (left + panelW > vw - 8) {
      left = Math.max(8, vw - panelW - 8);
    }

    if (top + panelH > vh - 8) {
      top = Math.max(8, vh - panelH - 8);
    }

    setFlyoutPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!isDesktop || openRootId == null) return;
    syncFlyoutPosition(openRootId);
  }, [openRootId, isDesktop]);

  useEffect(() => {
    if (!isDesktop || openRootId == null) return;

    const onScrollOrResize = () => syncFlyoutPosition(openRootId);

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openRootId, isDesktop]);

  const openNode =
    openRootId != null
      ? roots.find((n) => String(n.id) === String(openRootId))
      : null;

  const openSubs = openNode?.subcategories ?? [];

  const flyoutPortal =
    isDesktop && openNode && openSubs.length > 0
      ? createPortal(
          <div
            className="all-categories-flyout fixed z-[500] max-w-[calc(100vw-1rem)]"
            style={{
              top: flyoutPos.top,
              left: flyoutPos.left,
            }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={() => {
              clearCloseTimer();
              leaveTimerRef.current = setTimeout(
                () => setOpenRootId(null),
                350
              );
            }}
          >
            <div
              className={`max-h-[min(70vh,420px)] w-max min-w-[220px] max-w-[280px] overflow-visible ${catMenuPanelClass}`}
            >
              {openSubs.map((child) => (
                <CategorySubmenuRow
                  key={child.id}
                  node={child}
                  rootName={openNode.name}
                  onNavigate={onNavigate}
                  depth={0}
                  isDesktop={isDesktop}
                />
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      role="menu"
      className={`${catMenuShellClass} w-[calc(100vw-1.5rem)] max-w-[320px] md:w-[min(92vw,280px)] md:max-w-[280px]`}
    >
      <div className="max-h-[min(72vh,520px)] overflow-x-hidden overflow-y-auto bg-white px-1.5 py-1.5 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.18)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/80 [&::-webkit-scrollbar-track]:bg-transparent">
        {roots.map((node) => {
          const subs = node.subcategories ?? [];
          const hasKids = subs.length > 0;
          const isOpen = String(openRootId) === String(node.id);
          const shopTo = `/shop?category=${encodeURIComponent(node.name)}`;

          const toggleRoot = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (isDesktop) {
              syncFlyoutPosition(node.id);
            }

            setOpenRootId((cur) =>
              String(cur) === String(node.id) ? null : node.id
            );
          };

          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) rowElRef.current[node.id] = el;
                else delete rowElRef.current[node.id];
              }}
              className="relative border-b border-gray-100/75 last:border-b-0"
              onMouseEnter={() => {
                if (!isDesktop || !hasKids) return;

                clearCloseTimer();
                syncFlyoutPosition(node.id);
                setOpenRootId(node.id);
              }}
              onMouseLeave={() => {
                if (!isDesktop || !hasKids) return;

                clearCloseTimer();
                leaveTimerRef.current = setTimeout(() => {
                  setOpenRootId((cur) =>
                    String(cur) === String(node.id) ? null : cur
                  );
                }, 350);
              }}
            >
              <div className="group flex w-full min-w-0 items-stretch">
                {hasKids ? (
                  <button
                    type="button"
                    onClick={toggleRoot}
                    className={`${catRowLinkClass} flex-1 bg-transparent`}
                  >
                    {node.image && String(node.image).trim() !== "" ? (
                      <img
                        src={`${BASE_URL}/uploads/${node.image}`}
                        alt=""
                        className={`h-8 w-8 ${catThumbClass}`}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                      {node.name}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={shopTo}
                    onClick={onNavigate}
                    className={`${catRowLinkClass} flex-1`}
                  >
                    {node.image && String(node.image).trim() !== "" ? (
                      <img
                        src={`${BASE_URL}/uploads/${node.image}`}
                        alt=""
                        className={`h-8 w-8 ${catThumbClass}`}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                      {node.name}
                    </span>
                  </Link>
                )}

                {hasKids ? (
                  <button
                    type="button"
                    onClick={toggleRoot}
                    className="inline-flex min-h-[44px] min-w-[42px] shrink-0 items-center justify-center rounded-r-lg bg-transparent text-gray-400/90 transition-colors group-hover:bg-orange-50/90 group-hover:text-orange-600"
                    aria-expanded={isOpen}
                  >
                    <i
                      className={`fa-solid ${
                        isDesktop ? "fa-angle-right" : "fa-angle-down"
                      } text-xs opacity-85 transition-transform ${
                        !isDesktop && isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <span className="w-3 shrink-0" aria-hidden />
                )}
              </div>

              {!isDesktop && hasKids && isOpen && (
                <div className="ml-3 border-l border-orange-100 bg-white pl-2">
                  {subs.map((child) => (
                    <CategorySubmenuRow
                      key={child.id}
                      node={child}
                      rootName={node.name}
                      onNavigate={onNavigate}
                      depth={0}
                      isDesktop={isDesktop}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {flyoutPortal}
    </div>
  );
}

function NavMegaMenuItem({ node, topCatName, onPick, depth = 0, isDesktop }) {
  const subs = node.subcategories ?? [];
  const hasKids = subs.length > 0;
  const [open, setOpen] = useState(false);

  const shopUrl = `/shop?category=${encodeURIComponent(
    topCatName
  )}&subCategory=${encodeURIComponent(node.name)}`;

  if (!isDesktop) {
    return (
      <div className="border-b border-gray-100/80 bg-white last:border-b-0">
        <div className="group flex min-w-0 cursor-pointer items-stretch select-none bg-white">
          <Link
            href={shopUrl}
            onClick={onPick}
            className={`${catRowLinkClass} flex-1`}
          >
            {node.image && String(node.image).trim() !== "" ? (
              <img
                src={`${BASE_URL}/uploads/${node.image}`}
                alt=""
                className={`h-8 w-8 ${catThumbClass}`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <span className="min-w-0 flex-1 truncate font-medium">
              {node.name}
            </span>
          </Link>

          {hasKids ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-r-lg bg-transparent text-gray-400/90 transition-colors group-hover:text-orange-600"
              aria-expanded={open}
            >
              <i
                className={`fa-solid fa-angle-down text-xs opacity-85 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}
        </div>

        {open && hasKids && (
          <div className="ml-3 border-l border-orange-100 bg-white pl-2">
            {subs.map((child) => (
              <NavMegaMenuItem
                key={child.id}
                node={child}
                topCatName={topCatName}
                onPick={onPick}
                depth={depth + 1}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative border-b border-gray-100/80 last:border-b-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="group flex min-w-0 cursor-pointer items-stretch select-none">
        <Link
          href={shopUrl}
          onClick={onPick}
          className={`${catRowLinkClass} flex-1`}
        >
          {node.image && String(node.image).trim() !== "" ? (
            <img
              src={`${BASE_URL}/uploads/${node.image}`}
              alt=""
              className={`h-8 w-8 ${catThumbClass}`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}

          <span className="min-w-0 flex-1 truncate font-medium">
            {node.name}
          </span>
        </Link>

        {hasKids ? (
          <span
            className="inline-flex min-h-[40px] min-w-[36px] shrink-0 items-center justify-center rounded-r-lg text-gray-400/90 transition-colors group-hover:text-orange-600"
            aria-hidden
          >
            <i className="fa-solid fa-angle-right text-xs opacity-85" />
          </span>
        ) : null}
      </div>

      {open && hasKids && (
        <div
          className={`absolute left-full top-0 ml-1 w-max min-w-[220px] max-w-[280px] ${catMenuPanelClass}`}
          style={{ zIndex: 999 + depth }}
        >
          {subs.map((child) => (
            <NavMegaMenuItem
              key={child.id}
              node={child}
              topCatName={topCatName}
              onPick={onPick}
              depth={depth + 1}
              isDesktop={isDesktop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMegaMenuList({ nodes, topCatName, onPick, depth = 0 }) {
  const [openId, setOpenId] = useState(null);

  return (
    <>
      {(nodes || []).map((node) => {
        const subs = node.subcategories ?? [];
        const hasKids = subs.length > 0;
        const isOpen = String(openId) === String(node.id);

        const shopUrl = `/shop?category=${encodeURIComponent(
          topCatName
        )}&subCategory=${encodeURIComponent(node.name)}`;

        if (!hasKids) {
          return (
            <div
              key={node.id}
              className="border-b border-gray-100/80 bg-white last:border-b-0"
            >
              <Link
                href={shopUrl}
                onClick={onPick}
                className={`${catRowLinkClass} flex-1`}
              >
                {node.image && String(node.image).trim() !== "" ? (
                  <img
                    src={`${BASE_URL}/uploads/${node.image}`}
                    alt=""
                    className={`h-8 w-8 ${catThumbClass}`}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}

                <span className="min-w-0 flex-1 truncate font-medium">
                  {node.name}
                </span>
              </Link>
            </div>
          );
        }

        return (
          <div
            key={node.id}
            className="border-b border-gray-100/80 bg-white last:border-b-0"
          >
            <div className="group flex min-w-0 cursor-pointer items-stretch select-none bg-white">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setOpenId((cur) =>
                    String(cur) === String(node.id) ? null : node.id
                  );
                }}
                className={`${catRowLinkClass} flex-1 bg-transparent`}
              >
                {node.image && String(node.image).trim() !== "" ? (
                  <img
                    src={`${BASE_URL}/uploads/${node.image}`}
                    alt=""
                    className={`h-8 w-8 ${catThumbClass}`}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}

                <span className="min-w-0 flex-1 truncate font-medium">
                  {node.name}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  setOpenId((cur) =>
                    String(cur) === String(node.id) ? null : node.id
                  );
                }}
                className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-r-lg bg-transparent text-gray-400/90 transition-colors group-hover:text-orange-600"
                aria-expanded={isOpen}
              >
                <i
                  className={`fa-solid fa-angle-down text-xs opacity-85 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {isOpen && (
              <div className="ml-3 border-l border-orange-100 bg-white pl-2">
                <MobileMegaMenuList
                  nodes={subs}
                  topCatName={topCatName}
                  onPick={onPick}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

const Header = () => {
  const { cart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const searchDebounceRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState(null);

  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryopen, setCategoryOpen] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [productCatalog, setProductCatalog] = useState([]);
  // The full catalog (~1.4 MB) only feeds search suggestions, so it's fetched
  // the first time a search box gets focus instead of on every page load.
  const [catalogWanted, setCatalogWanted] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const [activeMenu, setActiveMenu] = useState(null);
  const [megaPanelPos, setMegaPanelPos] = useState(null);

  const centerNavTriggerRef = useRef({});
  const megaHoverLeaveTimerRef = useRef(null);

  const clearMegaHoverTimer = () => {
    if (megaHoverLeaveTimerRef.current) {
      clearTimeout(megaHoverLeaveTimerRef.current);
      megaHoverLeaveTimerRef.current = null;
    }
  };

  const closeAllDropdowns = () => {
    clearMegaHoverTimer();
    setCategoryOpen(false);
    setAccountOpen(false);
    setActiveMenu(null);
    setMegaPanelPos(null);
  };

  const toggleAccountDropdown = () => {
    clearMegaHoverTimer();
    setCategoryOpen(false);
    setActiveMenu(null);
    setMegaPanelPos(null);
    setAccountOpen((v) => !v);
  };

  const toggleAllCategoriesDropdown = () => {
    clearMegaHoverTimer();
    setAccountOpen(false);
    setActiveMenu(null);
    setMegaPanelPos(null);
    setCategoryOpen((v) => !v);
  };

  const toggleCenterCategoryDropdown = (catId) => {
    clearMegaHoverTimer();
    setAccountOpen(false);
    setCategoryOpen(false);
    setMegaPanelPos(null);
    setActiveMenu((cur) => (String(cur) === String(catId) ? null : catId));
  };

  const scheduleMegaMenuClose = () => {
    clearMegaHoverTimer();

    megaHoverLeaveTimerRef.current = setTimeout(() => {
      setActiveMenu(null);
      setMegaPanelPos(null);
      megaHoverLeaveTimerRef.current = null;
    }, 320);
  };

  useEffect(() => () => clearMegaHoverTimer(), []);

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!catalogWanted) return;
    let cancelled = false;

    (async () => {
      try {
        const perPage = 200;
        const maxPages = 25;
        const merged = [];
        const seenIds = new Set();

        for (let page = 1; page <= maxPages; page += 1) {
          const res = await getProductsApi({ page, limit: perPage });
          const list = extractProductRows(res);
          const rows = Array.isArray(list) ? list : [];

          rows.forEach((item) => {
            const entity = unwrapProductEntity(item);
            const id = getProductRouteId(entity);

            if (id == null) return;

            const key = String(id);

            if (seenIds.has(key)) return;

            seenIds.add(key);
            merged.push(entity);
          });

          const meta = extractPaginationMeta(res);
          const totalPages = meta?.totalPages;

          if (Number.isFinite(totalPages) && page >= totalPages) break;
          if (rows.length < perPage) break;
        }

        if (!cancelled) {
          setProductCatalog(merged);
        }
      } catch {
        if (!cancelled) setProductCatalog([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogWanted]);

  const allCategoryNames = useMemo(() => {
    const names = collectCategoryNamesDeep(categories, []);
    return [...new Set(names.filter(Boolean))];
  }, [categories]);

  const activeNavCategory = useMemo(() => {
    if (activeMenu == null) return null;
    return categories.find((c) => String(c.id) === String(activeMenu)) ?? null;
  }, [activeMenu, categories]);

  useLayoutEffect(() => {
    if (
      !isDesktop ||
      activeMenu == null ||
      !activeNavCategory?.subcategories?.length
    ) {
      setMegaPanelPos(null);
      return;
    }

    const el = centerNavTriggerRef.current[activeMenu];

    if (!el) {
      setMegaPanelPos(null);
      return;
    }

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelMinW = Math.min(Math.max(r.width, 240), 320);

    let left = r.left;

    if (left + panelMinW > vw - 12) {
      left = Math.max(12, vw - panelMinW - 12);
    }

    setMegaPanelPos({
      top: r.bottom + 6,
      left,
      minWidth: panelMinW,
    });
  }, [activeMenu, activeNavCategory, isDesktop]);

  useEffect(() => {
    if (!isDesktop || activeMenu == null) return;

    const onScrollOrResize = () => {
      if (activeMenu == null || !activeNavCategory?.subcategories?.length) {
        return;
      }

      const el = centerNavTriggerRef.current[activeMenu];

      if (!el) return;

      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const panelMinW = Math.min(Math.max(r.width, 240), 320);

      let left = r.left;

      if (left + panelMinW > vw - 12) {
        left = Math.max(12, vw - panelMinW - 12);
      }

      setMegaPanelPos({
        top: r.bottom + 6,
        left,
        minWidth: panelMinW,
      });
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [activeMenu, activeNavCategory, isDesktop]);

  const findBestCategoryMatch = (rawQuery) => {
    const q = String(rawQuery ?? "").trim().toLowerCase();

    if (!q) return null;

    const entries = allCategoryNames.map((n) => ({
      n,
      l: n.toLowerCase(),
    }));

    const exact = entries.find((x) => x.l === q);

    if (exact) return exact.n;

    const prefix = entries.filter((x) => x.l.startsWith(q));

    if (prefix.length) {
      prefix.sort((a, b) => b.n.length - a.n.length);
      return prefix[0].n;
    }

    const inc = entries.filter((x) => x.l.includes(q));

    if (inc.length) {
      inc.sort((a, b) => b.n.length - a.n.length);
      return inc[0].n;
    }

    return null;
  };

  const findBestProductMatchInList = (list, rawQuery) => {
    const q = normalizeSearchString(rawQuery);

    if (!q) return null;

    const rows = (Array.isArray(list) ? list : [])
      .map((item) => unwrapProductEntity(item))
      .filter(Boolean);

    const rowsWithSearchBlob = rows.map((p) => ({
      product: p,
      nameKey: normalizeSearchString(p?.name),
      blobKey: buildProductSearchBlob(p),
    }));

    const exactName = rowsWithSearchBlob.find((x) => x.nameKey === q)?.product;
    if (exactName) return exactName;

    const exactBlob = rowsWithSearchBlob.find((x) => x.blobKey === q)?.product;
    if (exactBlob) return exactBlob;

    const startsWithName = rowsWithSearchBlob.find((x) =>
      x.nameKey.startsWith(q)
    )?.product;
    if (startsWithName) return startsWithName;

    const startsWithBlob = rowsWithSearchBlob.find((x) =>
      x.blobKey.startsWith(q)
    )?.product;
    if (startsWithBlob) return startsWithBlob;

    const includesName = rowsWithSearchBlob.find((x) =>
      x.nameKey.includes(q)
    )?.product;
    if (includesName) return includesName;

    const includesBlob = rowsWithSearchBlob.find((x) =>
      x.blobKey.includes(q)
    )?.product;
    if (includesBlob) return includesBlob;

    return null;
  };

  const findBestProductMatch = (rawQuery) =>
    findBestProductMatchInList(productCatalog, rawQuery);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const q = searchText.trim().toLowerCase();

    if (q.length < 2) {
      setSearchSuggestions([]);
      setCategorySuggestions([]);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      const qKey = normalizeSearchString(q);

      const catMatches = allCategoryNames
        .filter((n) => n.toLowerCase().includes(q))
        .slice(0, 5);

      setCategorySuggestions(catMatches);

      const matches = productCatalog
        .filter((p) => buildProductSearchBlob(p).includes(qKey))
        .slice(0, 8);

      setSearchSuggestions(matches);
    }, 220);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchText, productCatalog, allCategoryNames]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getCategoriesApi();

        let all = Array.isArray(res?.categories)
          ? res.categories
          : Array.isArray(res?.data?.categories)
            ? res.data.categories
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res)
                ? res
                : [];

        all = all.sort(compareCategoriesOldestFirst);

        setCategories(buildCategoryTree(all));

        const token = getUserToken();

        if (token) {
          const data = await getWishlistApi();
          setWishlistCount(data.length);
        } else {
          const guest = JSON.parse(
            localStorage.getItem("guestWishlist") || "[]"
          );
          setWishlistCount(guest.length);
        }
      } catch (err) {
        console.log(err);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const token = getUserToken();
    const storedUser = localStorage.getItem("user");

    if (token) {
      setUser(storedUser ? JSON.parse(storedUser) : { name: "User" });
    }

    // Server rejected the session (see lib/authSession) — show logged-out state.
    const onExpired = () => {
      setUser(null);
      setWishlistCount(JSON.parse(localStorage.getItem("guestWishlist") || "[]").length);
    };
    window.addEventListener(USER_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(USER_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (e.target.closest(".category-dropdown")) return;
      if (e.target.closest(".all-categories-flyout")) return;
      if (e.target.closest(".nav-mega-dropdown")) return;
      if (e.target.closest(".nav-mega-dropdown-panel")) return;
      if (e.target.closest(".account-dropdown")) return;

      closeAllDropdowns();
    };

    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      closeAllDropdowns();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    clearUserSession();
    toast.success("Logout");
    setUser(null);
    closeAllDropdowns();
  };

  const handleSearch = async () => {
    setShowSearchSuggestions(false);

    const q = searchText.trim();

    if (!q) {
      router.push("/shop");
      return;
    }

    const matchedProduct = findBestProductMatch(q);
    const matchedProductId = getProductRouteId(matchedProduct);

    if (matchedProductId != null) {
      router.push(`/productPage/${matchedProductId}`);
      return;
    }

    try {
      const remoteRes = await getProductsApi({ search: q, limit: 25, page: 1 });
      const remoteProducts = extractProductRows(remoteRes);
      const remoteMatch = findBestProductMatchInList(remoteProducts, q);
      const remoteMatchId = getProductRouteId(remoteMatch);

      if (remoteMatchId != null) {
        router.push(`/productPage/${remoteMatchId}`);
        return;
      }
    } catch {
      // Continue to category/search fallback.
    }

    const catMatch = findBestCategoryMatch(q);

    if (catMatch) {
      router.push(`/shop?category=${encodeURIComponent(catMatch)}`);
      return;
    }

    router.push(`/shop?search=${encodeURIComponent(q)}`);
  };

  const goToProductFromSuggestion = (product) => {
    setShowSearchSuggestions(false);
    closeAllDropdowns();
    router.push(`/productPage/${product.slug || product.id}`);
  };

  const goToCategoryFromSuggestion = (categoryName) => {
    setShowSearchSuggestions(false);
    closeAllDropdowns();
    router.push(`/shop?category=${encodeURIComponent(categoryName)}`);
  };

  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  const renderSearchSuggestions = (mobile = false) =>
    showSearchSuggestions &&
    (categorySuggestions.length > 0 || searchSuggestions.length > 0) && (
      <ul
        className={`absolute left-0 right-0 top-full z-[10002] mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl ${
          mobile ? "" : ""
        }`}
        role="listbox"
      >
        {categorySuggestions.map((catName) => (
          <li
            key={`${mobile ? "m-" : ""}cat-${catName}`}
            role="option"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goToCategoryFromSuggestion(catName)}
            className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 hover:bg-amber-50"
          >
            <i className="fa-solid fa-layer-group shrink-0 text-sm text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Category
              </p>
              <p className="truncate text-sm font-medium text-gray-900">
                {catName}
              </p>
            </div>
          </li>
        ))}

        {searchSuggestions.map((p) => (
          <li
            key={p.id}
            role="option"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goToProductFromSuggestion(p)}
            className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-orange-50"
          >
            <img
              src={p.image ? `${BASE_URL}/uploads/${p.image}` : "/no-image.png"}
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
              onError={(e) => {
                // Fallback once — never loop if the placeholder itself fails.
                if (!e.target.src.endsWith("/no-image.png")) e.target.src = "/no-image.png";
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {p.name}
              </p>

              {p.category ? (
                <p className="truncate text-xs text-gray-500">{p.category}</p>
              ) : null}
            </div>

            <span className="shrink-0 text-xs font-semibold text-orange-600">
              ₹{Number(p.price || 0).toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="relative isolate z-[200]">
      <div className="overflow-visible bg-white">
        <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-8 lg:px-side">
          <div className="space-y-3 md:hidden">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Link href="/" className="min-w-0 shrink">
                <img
                  src={logo}
                  className="h-auto w-[5.5rem] max-w-[40vw] object-contain sm:w-24"
                  alt="logo"
                />
              </Link>

              <div className="flex shrink-0 touch-manipulation items-center gap-3 text-lg text-[#FF6B00] min-[380px]:gap-4 min-[380px]:text-xl">
                <div className="relative">
                  <Link href="/wishlist" onClick={closeAllDropdowns}>
                    <i className="fa-regular fa-heart" />

                    {wishlistCount > 0 && (
                      <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                </div>

                <div className="relative">
                  <Link href="/cart" onClick={closeAllDropdowns}>
                    <i className="fa-solid fa-bag-shopping" />

                    {cartCount > 0 && (
                      <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </div>

                <div className="account-dropdown relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAccountDropdown();
                    }}
                    className="bg-transparent p-0 text-inherit"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                  >
                    <i className="fa-regular fa-user cursor-pointer" />
                  </button>

                  {accountOpen && (
                    <div
                      className="fixed right-4 top-[92px] z-[100000] w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user ? (
                        <>
                          <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-900">
                            Hello, {user.name}
                          </div>

                          <Link
                            href="/account"
                            onClick={closeAllDropdowns}
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            Profile
                          </Link>

                          <Link
                            href="/account?tab=orders"
                            onClick={closeAllDropdowns}
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            My Orders
                          </Link>

                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/login"
                            onClick={closeAllDropdowns}
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            Login
                          </Link>

                          <Link
                            href="/register"
                            onClick={closeAllDropdowns}
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            Register
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-[10001] min-w-0">
              <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => {
                    setShowSearchSuggestions(true);
                    setCatalogWanted(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowSearchSuggestions(false), 180)
                  }
                  className="h-full min-w-0 flex-1 px-3 text-sm text-black outline-none sm:px-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={
                    showSearchSuggestions &&
                    (searchSuggestions.length > 0 ||
                      categorySuggestions.length > 0)
                  }
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex h-full w-12 shrink-0 items-center justify-center bg-orange-500 text-white"
                >
                  <i className="fa-solid fa-magnifying-glass" />
                </button>
              </div>

              {renderSearchSuggestions(true)}
            </div>
          </div>

          <div className="hidden min-w-0 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-3 lg:gap-4">
            <Link href="/" className="shrink-0" onClick={closeAllDropdowns}>
              <img
                src={logo}
                className="h-auto w-24 max-w-[min(8rem,28vw)] object-contain md:w-28 lg:w-32"
                alt="logo"
              />
            </Link>

            <div className="relative z-[10001] min-w-0 flex-1 md:max-w-none lg:mx-2 lg:max-w-[620px]">
              <div className="flex h-11 items-center rounded-md border border-gray-300 bg-white sm:h-12">
                <input
                  value={searchText}
                  placeholder="Search products or categories..."
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => {
                    setShowSearchSuggestions(true);
                    setCatalogWanted(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowSearchSuggestions(false), 180)
                  }
                  className="h-full min-w-0 flex-1 px-3 text-sm outline-none sm:px-4"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={
                    showSearchSuggestions &&
                    (searchSuggestions.length > 0 ||
                      categorySuggestions.length > 0)
                  }
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex h-full w-12 shrink-0 items-center justify-center bg-orange-500 text-white hover:bg-orange-600 sm:w-14"
                >
                  <i className="fa-solid fa-magnifying-glass" />
                </button>
              </div>

              {renderSearchSuggestions(false)}
            </div>

            <div className="flex shrink-0 items-center gap-3 text-lg md:gap-5 md:text-xl lg:gap-7">
              <div className="relative">
                <Link href="/wishlist" onClick={closeAllDropdowns}>
                  <i className="fa-regular fa-heart text-[#FF6B00] hover:text-[#153979]" />

                  {wishlistCount > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              </div>

              <div className="relative">
                <Link href="/cart" onClick={closeAllDropdowns}>
                  <i className="fa-solid fa-bag-shopping text-[#FF6B00] hover:text-[#153979]" />

                  {cartCount > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B00] text-xs text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-visible border-t border-gray-200 bg-gray-100">
        <div className="relative flex min-h-[52px] w-full flex-wrap items-stretch gap-2 overflow-visible px-3 py-1.5 sm:px-4 sm:py-2 md:min-h-14 md:flex-nowrap md:items-center md:gap-3 md:px-6 md:py-0 lg:px-side">
          <div className="category-dropdown relative z-30 flex w-fit shrink-0 items-center self-center">
            <button
              type="button"
              className={`inline-flex h-10 min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition min-[400px]:gap-2.5 min-[400px]:px-3.5 min-[400px]:text-sm md:h-11 md:gap-3 md:px-5 md:text-base ${
                categoryopen
                  ? "border-orange-600 bg-orange-50 text-orange-800 shadow-sm ring-2 ring-orange-200/80"
                  : "border-orange-500 bg-white text-gray-900 hover:bg-orange-50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleAllCategoriesDropdown();
              }}
              aria-expanded={categoryopen}
              aria-haspopup="menu"
            >
              <i className="fa-solid fa-bars shrink-0" aria-hidden />
              <span className="hidden sm:inline">All Categories</span>
              <span className="inline sm:hidden">Categories</span>
              <i
                className={`fa-solid fa-angle-down shrink-0 text-xs transition-transform duration-200 ${
                  categoryopen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {categoryopen && (
              <div
                className="absolute left-0 top-full z-[400] w-[calc(100vw-1.5rem)] max-w-[320px] pt-2 sm:pt-3 md:w-auto md:max-w-[calc(100vw-1.5rem)]"
                role="presentation"
              >
                <AllCategoriesFlyout
                  roots={categories}
                  onNavigate={closeAllDropdowns}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 self-center overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav
              className="flex w-max min-w-0 max-w-none touch-pan-x items-center justify-start gap-4 whitespace-nowrap py-0.5 text-sm font-medium text-gray-700 sm:gap-6 md:gap-7 lg:gap-9 xl:gap-10"
              aria-label="Category navigation"
            >
              {categories.slice(0, 6).map((cat) => (
                <div
                  key={cat.id}
                  ref={(el) => {
                    if (el) centerNavTriggerRef.current[cat.id] = el;
                    else delete centerNavTriggerRef.current[cat.id];
                  }}
                  className="nav-mega-dropdown relative z-10 shrink-0"
                  onMouseEnter={() => {
                    if (!isDesktop) return;

                    clearMegaHoverTimer();
                    setAccountOpen(false);
                    setCategoryOpen(false);

                    if (cat.subcategories?.length > 0) {
                      setActiveMenu(cat.id);
                    } else {
                      setActiveMenu(null);
                      setMegaPanelPos(null);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isDesktop) scheduleMegaMenuClose();
                  }}
                >
                  <div
                    className={`flex cursor-pointer items-center gap-2 px-0.5 transition hover:text-orange-500 ${
                      String(activeMenu) === String(cat.id)
                        ? "text-orange-600"
                        : ""
                    }`}
                  >
                    {cat.subcategories?.length > 0 ? (
                      <button
                        type="button"
                        className="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 bg-transparent p-0 font-inherit text-inherit hover:text-orange-500"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCenterCategoryDropdown(cat.id);
                        }}
                        aria-expanded={String(activeMenu) === String(cat.id)}
                        aria-haspopup="menu"
                      >
                        <span className="inline-block max-w-[28vw] truncate sm:max-w-[12rem] md:max-w-none">
                          {cat.name}
                        </span>

                        <i
                          className={`fa-solid fa-angle-down shrink-0 text-xs transition ${
                            String(activeMenu) === String(cat.id)
                              ? "rotate-180"
                              : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <Link
                        href={`/shop?category=${encodeURIComponent(cat.name)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeAllDropdowns();
                        }}
                        className="inline-block max-w-[28vw] truncate sm:max-w-[12rem] md:max-w-none"
                      >
                        {cat.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              <Link
                href="/blog"
                onClick={closeAllDropdowns}
                className="shrink-0 px-0.5 transition hover:text-orange-500"
              >
                Blog
              </Link>

              <Link
                href="/warranty-register"
                onClick={closeAllDropdowns}
                className="shrink-0 px-0.5 transition hover:text-orange-500"
              >
                Warranty
              </Link>
            </nav>
          </div>

  {!isDesktop && activeNavCategory?.subcategories?.length > 0 && (
  <div className="order-last w-full md:hidden">
    <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-orange-100 bg-white p-1 shadow-xl ring-1 ring-orange-100">
      <MobileMegaMenuList
        nodes={activeNavCategory.subcategories}
        topCatName={activeNavCategory.name}
        onPick={closeAllDropdowns}
      />
    </div>
  </div>
)}

          <div className="account-dropdown relative z-30 hidden shrink-0 items-center self-center md:flex">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleAccountDropdown();
              }}
              className="inline-flex h-11 min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-md border border-orange-500 bg-white px-3.5 text-sm font-medium transition hover:bg-orange-50 md:gap-3 md:px-5 md:text-base"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <i className="fa-regular fa-user" />
              <span className="hidden sm:inline">My Account</span>
              <i
                className={`fa-solid fa-angle-down text-xs transition ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {accountOpen && (
              <div
                className="absolute right-0 top-12 z-[300] w-44 overflow-hidden rounded-md border bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {user ? (
                  <>
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium">
                      Hello, {user.name}
                    </div>

                    <Link
                      href="/account"
                      onClick={closeAllDropdowns}
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      Profile
                    </Link>

                    <Link
                      href="/account?tab=orders"
                      onClick={closeAllDropdowns}
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-red-500 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeAllDropdowns}
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      Login
                    </Link>

                    <Link
                      href="/register"
                      onClick={closeAllDropdowns}
                      className="block px-4 py-2 hover:bg-gray-100"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isDesktop &&
        activeMenu != null &&
        megaPanelPos &&
        activeNavCategory?.subcategories?.length > 0 &&
        createPortal(
          <div
            className="nav-mega-dropdown-panel pointer-events-auto fixed z-[520]"
            style={{
              top: megaPanelPos.top,
              left: megaPanelPos.left,
              minWidth: megaPanelPos.minWidth,
              maxWidth: "none",
            }}
            role="menu"
            onMouseEnter={clearMegaHoverTimer}
            onMouseLeave={() => {
              if (isDesktop) scheduleMegaMenuClose();
            }}
          >
            <div
              className={`max-h-[min(70vh,420px)] overflow-visible px-1.5 py-1 ${catMenuPanelClass}`}
            >
              {activeNavCategory.subcategories.map((sub) => (
                <NavMegaMenuItem
                  key={sub.id}
                  node={sub}
                  topCatName={activeNavCategory.name}
                  onPick={closeAllDropdowns}
                  depth={0}
                  isDesktop={isDesktop}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Header;
