import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Product } from "@geo/shared-types";
import { GeoCopyType, LLMModel } from "@geo/shared-types";

// API_BASE: Use VITE_API_TARGET for dev proxy, or VITE_BASE_PATH for production sub-path deployment
const API_BASE =
  import.meta.env.VITE_API_TARGET ||
  (import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH : "");

const dedupeProductsById = (items: Product[]) => {
  const seen = new Map<string, Product>();
  for (const item of items) seen.set(item.id, item);
  return Array.from(seen.values());
};

const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// --- Context for GEO State ---

interface GeoContextType {
  isAiPerspective: boolean;
  setIsAiPerspective: (v: boolean) => void;
  isGenerating: boolean;
  startGeneration: (modelId: string, count: number) => void;
  generationProgress: number;
  products: Product[];
  setProducts: (products: Product[]) => void;
  models: LLMModel[];
}

const GeoContext = createContext<GeoContextType | undefined>(undefined);

const useGeo = () => {
  const context = useContext(GeoContext);
  if (!context) throw new Error("useGeo must be used within a GeoProvider");
  return context;
};

const stripOuterMarkdownFence = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^```(?:\s*markdown|\s*md|\s*)\s*\r?\n([\s\S]*?)\r?\n```$/i
  );
  return (match?.[1] ?? trimmed).trim();
};

const MarkdownBox = ({ content }: { content: string }) => {
  const normalized = stripOuterMarkdownFence(content);

  return (
    <div className="w-full h-full overflow-auto rounded-xl bg-slate-950/40 border border-indigo-500/20 px-4 py-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="text-indigo-200 text-base font-bold mb-2"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="text-indigo-200 text-sm font-bold mt-3 mb-2"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="text-indigo-200 text-sm font-semibold mt-3 mb-2"
              {...props}
            />
          ),
          p: (props) => (
            <p
              className="text-indigo-100/90 text-sm leading-relaxed mb-2"
              {...props}
            />
          ),
          ul: (props) => (
            <ul
              className="list-disc ml-5 text-indigo-100/90 text-sm space-y-1 mb-2"
              {...props}
            />
          ),
          ol: (props) => (
            <ol
              className="list-decimal ml-5 text-indigo-100/90 text-sm space-y-1 mb-2"
              {...props}
            />
          ),
          li: (props) => <li className="leading-relaxed" {...props} />,
          strong: (props) => (
            <strong className="text-indigo-100 font-semibold" {...props} />
          ),
          em: (props) => (
            <em className="text-indigo-100/90 italic" {...props} />
          ),
          code: (props) => (
            <code
              className="font-mono text-[12px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              className="overflow-auto rounded-lg bg-slate-950 border border-indigo-500/20 p-3 text-indigo-100/90 text-xs"
              {...props}
            />
          ),

          // Tables (remark-gfm)
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-indigo-500/20 bg-slate-950/40">
              <table
                className="w-full border-collapse text-left text-xs"
                {...props}
              />
            </div>
          ),
          thead: (props) => <thead className="bg-indigo-500/10" {...props} />,
          tbody: (props) => (
            <tbody className="divide-y divide-indigo-500/10" {...props} />
          ),
          tr: (props) => <tr className="even:bg-white/5" {...props} />,
          th: (props) => (
            <th
              className="px-3 py-2 font-semibold text-indigo-100 border-b border-indigo-500/20 align-top whitespace-nowrap"
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="px-3 py-2 text-indigo-100/90 align-top whitespace-normal break-words border-b border-indigo-500/10"
              {...props}
            />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

// --- Components ---

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-sm text-gray-600">{rating}</span>
    </div>
  );
};

const ProductCard = ({
  product,
  onOpenGeo,
}: {
  product: Product;
  onOpenGeo: (p: Product) => void;
}) => {
  const { isAiPerspective } = useGeo();
  const [geoPageIndex, setGeoPageIndex] = useState(0);
  const geoList = Array.isArray(product.geoOptimized)
    ? product.geoOptimized
    : [product.geoOptimized];
  const currentGeo = geoList[geoPageIndex % geoList.length];
  const canPaginate = geoList.length > 1;

  // 从 coreFunctions 中提取 GEO type 标签（生成时可能会存入）
  const geoTypeLabel = currentGeo.coreFunctions?.[0];

  if (isAiPerspective) {
    return (
      <div
        onClick={() => onOpenGeo(product)}
        className="rounded-2xl shadow-lg overflow-hidden border transition-all hover:shadow-xl hover:border-indigo-400/50 bg-gradient-to-b from-slate-900 to-slate-950 border-indigo-500/30 text-indigo-100 flex flex-col cursor-pointer group"
      >
        {/* Header with product name and type badge */}
        <div className="px-5 pt-5 pb-3 border-b border-indigo-500/10">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-indigo-200 line-clamp-1 group-hover:text-indigo-100 transition-colors">
              {product.name}
            </h3>
            {geoTypeLabel && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {geoTypeLabel}
              </span>
            )}
          </div>
          {(product.id || product.price != null) && (
            <div className="flex items-center gap-3 text-[10px] font-mono text-indigo-500/60">
              {product.id && <span>ID: {product.id}</span>}
              {product.price != null && <span>¥{product.price}</span>}
            </div>
          )}
        </div>

        {/* Key Conclusion Content */}
        <div className="p-5 flex-1 min-h-[120px] max-h-[280px] overflow-hidden">
          {currentGeo.keyConclusion ? (
            <MarkdownBox content={currentGeo.keyConclusion} />
          ) : (
            <div className="text-sm text-indigo-400/60">暂无摘要内容</div>
          )}
        </div>

        {/* Footer with pagination */}
        <div className="px-5 py-3 border-t border-indigo-500/20 bg-indigo-500/5 flex justify-between items-center">
          <span className="text-[10px] font-mono text-indigo-400/70 uppercase tracking-widest">
            V{geoPageIndex + 1}/{geoList.length}
          </span>
          {canPaginate && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setGeoPageIndex((prev) =>
                    prev > 0 ? prev - 1 : geoList.length - 1
                  );
                }}
                className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-colors"
                aria-label="Previous version"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 19l-7-7 7-7" strokeWidth={2} />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setGeoPageIndex((prev) =>
                    prev < geoList.length - 1 ? prev + 1 : 0
                  );
                }}
                className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-colors"
                aria-label="Next version"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" strokeWidth={2} />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="rounded-xl shadow-sm overflow-hidden border transition-all hover:shadow-md group flex flex-col bg-white border-gray-100 text-gray-900"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm bg-white/90 backdrop-blur-sm text-gray-700">
            {product.category === "parametric"
              ? "数码电子"
              : product.category === "scenario"
              ? "美妆护肤"
              : "母婴用品"}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold mb-1 truncate">{product.name}</h3>

        {!isAiPerspective ? (
          <>
            <div className="flex items-center mb-2">
              <StarRating rating={product.rating} />
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                {product.reviewCount} 条评价
              </span>
            </div>
            <div className="flex justify-between items-end mt-auto pt-4">
              <div className="flex flex-col">
                {product.originalPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    ¥{product.originalPrice}
                  </span>
                )}
                <span className="text-xl font-bold text-red-600">
                  ¥{product.price}
                </span>
              </div>
              <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                加入购物车
              </button>
            </div>
          </>
        ) : (
          <div className="mt-2 space-y-3 flex-1">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-indigo-400/70 uppercase">
                Core Functions
              </div>
              <div className="flex flex-wrap gap-1">
                {currentGeo.coreFunctions.slice(0, 2).map((f, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-indigo-400/70 uppercase">
                Conclusion
              </div>
              <div className="text-[11px] font-mono text-indigo-300/90 line-clamp-3 leading-relaxed italic">
                "{currentGeo.keyConclusion}"
              </div>
            </div>
            <div className="pt-4 mt-auto flex justify-between items-center border-t border-indigo-500/20">
              <span className="text-lg font-mono font-bold text-indigo-400">
                VAL: {product.price}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGeoPageIndex((prev) =>
                      prev > 0
                        ? prev - 1
                        : Array.isArray(product.geoOptimized)
                        ? product.geoOptimized.length - 1
                        : 0
                    );
                  }}
                  className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 19l-7-7 7-7" strokeWidth={2} />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGeoPageIndex((prev) =>
                      prev <
                      (Array.isArray(product.geoOptimized)
                        ? product.geoOptimized.length - 1
                        : 0)
                        ? prev + 1
                        : 0
                    );
                  }}
                  className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 5l7 7-7 7" strokeWidth={2} />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

// --- GEO Modal ---

const GeoModal = ({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  if (!product) return null;

  const geoList = Array.isArray(product.geoOptimized)
    ? product.geoOptimized
    : [product.geoOptimized];
  const current = geoList[pageIndex];

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full bg-slate-900 border border-indigo-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-500/5">
          <div>
            <h2 className="text-xl font-mono font-bold text-indigo-300 flex items-center">
              <span className="mr-3 text-indigo-500">●</span>
              GEO_DATA_INSPECTION: {product.id}
            </h2>
            <p className="text-xs font-mono text-indigo-500/60 mt-1">
              VERSION {pageIndex + 1} OF {geoList.length} | SOURCE: AI_GENERATED
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-500/20 rounded-full text-indigo-400 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3 border-l-2 border-indigo-500 pl-2">
                  Product Identity
                </h4>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-indigo-500/10">
                  <div className="text-sm text-indigo-100 mb-1">
                    <span className="text-indigo-500/50 mr-2">NAME:</span>{" "}
                    {current.productName}
                  </div>
                  <div className="text-sm text-indigo-100">
                    <span className="text-indigo-500/50 mr-2">TYPE:</span>{" "}
                    {current.productType}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3 border-l-2 border-indigo-500 pl-2">
                  Core Functions
                </h4>
                <ul className="space-y-2">
                  {current.coreFunctions.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start text-sm text-indigo-200"
                    >
                      <span className="text-indigo-500 mr-2">›</span> {f}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3 border-l-2 border-indigo-500 pl-2">
                  Target Audience
                </h4>
                <div className="flex flex-wrap gap-2">
                  {current.targetAudience.map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 border-l-2 border-red-500 pl-2">
                  Unsuitable Scenarios
                </h4>
                <ul className="space-y-2">
                  {current.unsuitableScenarios.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start text-sm text-red-300/80"
                    >
                      <span className="text-red-500 mr-2">×</span> {s}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <section className="pt-6 border-t border-indigo-500/20">
            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">
              Key Conclusion
            </h4>
            <div className="h-72">
              <MarkdownBox content={current.keyConclusion} />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-indigo-500/20 bg-slate-950 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-indigo-400 disabled:opacity-30 font-bold hover:bg-slate-700 transition-all"
            >
              PREVIOUS
            </button>
            <button
              disabled={pageIndex === geoList.length - 1}
              onClick={() => setPageIndex((p) => p + 1)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-indigo-400 disabled:opacity-30 font-bold hover:bg-slate-700 transition-all"
            >
              NEXT
            </button>
          </div>
          <div className="text-indigo-500 font-mono text-sm font-bold">
            PRICE_VAL: ¥{product.price}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- GEO Control Center ---

const GeoControlCenter = () => {
  const {
    isAiPerspective,
    setIsAiPerspective,
    startGeneration,
    isGenerating,
    generationProgress,
    products,
    models,
  } = useGeo();
  const [isOpen, setIsOpen] = useState(false);
  const [engine, setEngine] = useState(models[0]?.id || "gpt-4o");
  const [count, setCount] = useState(1);

  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-indigo-500/20">
          <div className="mb-6 relative">
            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-indigo-400">
                {generationProgress}%
              </span>
            </div>
          </div>
          <h3 className="text-xl font-mono font-bold text-white mb-2 tracking-tight">
            正在进行 GEO 优化生成...
          </h3>
          <p className="text-indigo-400/60 text-sm font-mono mb-6">
            正在调用 {engine} 并发处理{" "}
            {products.length * Math.max(1, Math.min(count, 5))} 个内容节点
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end space-y-4">
        {isAiPerspective && (
          <button
            onClick={() => setIsAiPerspective(false)}
            className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-red-700 transition-all flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            退出 AI 视角
          </button>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${
            isAiPerspective
              ? "bg-indigo-600 text-white ring-4 ring-indigo-500/30"
              : "bg-slate-900 text-white"
          }`}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </button>
      </div>

      {/* Config Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-fadeIn">
            <div className="bg-slate-900 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                GEO 优化配置
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                配置 AI 引擎以生成强结构化内容
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  选择 AI 引擎
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setEngine(m.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        engine === m.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                          : "border-gray-100 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  生成数量 (每商品)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between mt-2 text-xs font-bold text-gray-600">
                  <span>1 个版本</span>
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {count} 个版本
                  </span>
                  <span>5 个版本</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    startGeneration(engine, count);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  开始生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- Pages ---

const HomePage = () => {
  const { isAiPerspective, products } = useGeo();
  const [filter, setFilter] = useState<
    "all" | "parametric" | "scenario" | "constraint"
  >("all");
  const [selectedGeoProduct, setSelectedGeoProduct] = useState<Product | null>(
    null
  );

  const uniqueProducts = useMemo(
    () => dedupeProductsById(products),
    [products]
  );

  const filteredProducts =
    filter === "all"
      ? uniqueProducts
      : uniqueProducts.filter((p) => p.category === filter);

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-500 ${
        isAiPerspective ? "bg-slate-950" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1
            className={`text-2xl font-bold ${
              isAiPerspective ? "text-white font-mono" : "text-gray-900"
            }`}
          >
            {isAiPerspective ? "> SCANNING_RECOMMENDATIONS" : "精选推荐"}
          </h1>
          <p
            className={`${
              isAiPerspective
                ? "text-indigo-400/60 font-mono text-xs"
                : "text-gray-500 text-sm"
            }`}
          >
            {isAiPerspective
              ? "STATUS: AI_OPTIMIZED_VIEW_ACTIVE"
              : "发现最适合您的优质商品"}
          </p>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: "all", label: "全部" },
            { id: "parametric", label: "数码电子" },
            { id: "scenario", label: "美妆护肤" },
            { id: "constraint", label: "母婴用品" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isAiPerspective
                  ? filter === btn.id
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900 text-indigo-400 border border-indigo-500/30 hover:bg-slate-800"
                  : filter === btn.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-6 ${
          isAiPerspective
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpenGeo={(p) => setSelectedGeoProduct(p)}
          />
        ))}
      </div>

      <GeoModal
        product={selectedGeoProduct}
        onClose={() => setSelectedGeoProduct(null)}
      />
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAiPerspective, products } = useGeo();
  const [geoPageIndex, setGeoPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");

  const uniqueProducts = useMemo(
    () => dedupeProductsById(products),
    [products]
  );
  const product = uniqueProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">商品不存在</h2>
        <button onClick={() => navigate("/")} className="mt-4 text-indigo-600">
          返回首页
        </button>
      </div>
    );
  }

  const geoList = Array.isArray(product.geoOptimized)
    ? product.geoOptimized
    : [product.geoOptimized];
  const currentGeo = geoList[geoPageIndex % geoList.length];

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isAiPerspective
          ? "bg-slate-950 text-indigo-100"
          : "bg-white text-gray-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate(-1)}
          className={`mb-8 flex items-center transition-colors ${
            isAiPerspective
              ? "text-indigo-400 hover:text-indigo-200"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div
              className={`aspect-square rounded-2xl overflow-hidden border transition-all ${
                isAiPerspective
                  ? "bg-slate-900 border-indigo-500/30 grayscale opacity-70"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <nav
              className={`flex mb-4 text-sm ${
                isAiPerspective
                  ? "text-indigo-500/60 font-mono"
                  : "text-gray-500"
              }`}
            >
              <span>首页</span>
              <span className="mx-2">/</span>
              <span>
                {product.category === "parametric"
                  ? "数码电子"
                  : product.category === "scenario"
                  ? "美妆护肤"
                  : "母婴用品"}
              </span>
            </nav>

            <h1
              className={`text-3xl font-extrabold mb-2 ${
                isAiPerspective
                  ? "font-mono tracking-tight text-indigo-300"
                  : "text-gray-900"
              }`}
            >
              {isAiPerspective
                ? `[NODE_ID: ${product.id}] ${product.name}`
                : product.name}
            </h1>

            {!isAiPerspective ? (
              <>
                <div className="flex items-center mb-6">
                  <StarRating rating={product.rating} />
                  <span className="ml-4 text-sm text-indigo-600 font-medium">
                    {product.reviewCount} 条真实评价
                  </span>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl mb-8">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-red-600">
                      ¥{product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="ml-2 text-gray-400 line-through text-sm">
                        ¥{product.originalPrice}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    库存充足 ({product.stock} 件)
                  </p>
                </div>

                <div className="space-y-6 mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">
                      核心亮点
                    </h3>
                    <ul className="grid grid-cols-1 gap-2">
                      {product.humanReadable.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start text-sm text-gray-600"
                        >
                          <svg
                            className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-8 animate-fadeIn">
                <div className="bg-indigo-950/30 border border-indigo-500/20 p-6 rounded-2xl font-mono">
                  <div className="flex justify-between items-center mb-4 border-b border-indigo-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-500">
                        GEO_STRUCTURED_DATA
                      </span>
                      <span className="text-[10px] px-1 bg-indigo-500/20 rounded text-indigo-400">
                        V{geoPageIndex + 1}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setGeoPageIndex((p) => Math.max(0, p - 1))
                        }
                        className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 disabled:opacity-20"
                        disabled={geoPageIndex === 0}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M15 19l-7-7 7-7" strokeWidth={2} />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          setGeoPageIndex((p) =>
                            Math.min(geoList.length - 1, p + 1)
                          )
                        }
                        className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 disabled:opacity-20"
                        disabled={geoPageIndex === geoList.length - 1}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 5l7 7-7 7" strokeWidth={2} />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <section>
                      <p className="text-[10px] text-indigo-500/60 uppercase">
                        Product Name
                      </p>
                      <p className="text-sm text-indigo-200">
                        {currentGeo.productName}
                      </p>
                    </section>
                    <section>
                      <p className="text-[10px] text-indigo-500/60 uppercase">
                        Product Type
                      </p>
                      <p className="text-sm text-indigo-200">
                        {currentGeo.productType}
                      </p>
                    </section>
                    <section>
                      <p className="text-[10px] text-indigo-500/60 uppercase">
                        Core Functions
                      </p>
                      <ul className="text-sm text-indigo-200 list-disc list-inside">
                        {currentGeo.coreFunctions.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>

                <div className="bg-slate-900 border border-indigo-500/20 p-6 rounded-2xl font-mono">
                  <p className="text-[10px] text-indigo-500/60 uppercase mb-2">
                    Key Conclusion
                  </p>
                  <div className="h-48">
                    <MarkdownBox content={currentGeo.keyConclusion} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-auto pt-8">
              <button
                className={`flex-1 py-4 rounded-xl font-bold transition-all shadow-lg ${
                  isAiPerspective
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                }`}
              >
                {isAiPerspective ? "EXECUTE_PURCHASE" : "立即购买"}
              </button>
              <button
                className={`flex-1 border-2 py-4 rounded-xl font-bold transition-all ${
                  isAiPerspective
                    ? "border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
                    : "border-gray-200 text-gray-900 hover:bg-gray-50"
                }`}
              >
                {isAiPerspective ? "ADD_TO_BUFFER" : "加入购物车"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-20">
          <div
            className={`border-b ${
              isAiPerspective ? "border-indigo-500/20" : "border-gray-200"
            }`}
          >
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("details")}
                className={`py-4 px-1 text-sm font-bold border-b-2 ${
                  activeTab === "details"
                    ? isAiPerspective
                      ? "border-indigo-500 text-indigo-400"
                      : "border-indigo-600 text-indigo-600"
                    : "border-transparent"
                }`}
              >
                {isAiPerspective ? "DATA_SPEC" : "商品详情"}
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`py-4 px-1 text-sm font-medium border-b-2 ${
                  activeTab === "reviews"
                    ? isAiPerspective
                      ? "border-indigo-500 text-indigo-400"
                      : "border-indigo-600 text-indigo-600"
                    : `border-transparent ${
                        isAiPerspective
                          ? "text-indigo-500/40 hover:text-indigo-400"
                          : "text-gray-500 hover:text-gray-700"
                      }`
                }`}
              >
                {isAiPerspective
                  ? "USER_FEEDBACK"
                  : `用户评价 (${product.reviewCount})`}
              </button>
            </nav>
          </div>

          <div className="py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              {activeTab === "details" ? (
                <>
                  <section>
                    <h2
                      className={`text-xl font-bold mb-4 ${
                        isAiPerspective
                          ? "text-indigo-300 font-mono"
                          : "text-gray-900"
                      }`}
                    >
                      {isAiPerspective ? ">> DESCRIPTION_STREAM" : "产品介绍"}
                    </h2>
                    <p
                      className={`leading-relaxed whitespace-pre-line ${
                        isAiPerspective
                          ? "text-indigo-400/80 font-mono text-sm"
                          : "text-gray-600"
                      }`}
                    >
                      {product.humanReadable.longDescription}
                    </p>
                  </section>

                  {isAiPerspective && (
                    <section className="bg-indigo-950/20 border border-indigo-500/10 p-8 rounded-3xl font-mono">
                      <h2 className="text-lg font-bold text-indigo-300 mb-6 flex items-center">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 animate-pulse"></span>
                        GEO_OPTIMIZATION_REPORT
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] text-indigo-500/60 uppercase mb-3">
                            Target Audience
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {currentGeo.targetAudience.map((t, i) => (
                              <span
                                key={i}
                                className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-xs text-indigo-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-red-500/60 uppercase mb-3">
                            Unsuitable Scenarios
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {currentGeo.unsuitableScenarios.map((t, i) => (
                              <span
                                key={i}
                                className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full text-xs text-red-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section>
                  <h2
                    className={`text-xl font-bold mb-4 ${
                      isAiPerspective
                        ? "text-indigo-300 font-mono"
                        : "text-gray-900"
                    }`}
                  >
                    {isAiPerspective ? ">> USER_FEEDBACK_STREAM" : "用户评价"}
                  </h2>

                  {product.reviews?.length ? (
                    <div className="space-y-4">
                      {product.reviews.map((r) => (
                        <div
                          key={r.id}
                          className={`p-6 rounded-2xl border transition-all ${
                            isAiPerspective
                              ? "bg-slate-900 border-indigo-500/20 text-indigo-100"
                              : "bg-white border-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div
                                className={`text-sm font-bold ${
                                  isAiPerspective
                                    ? "font-mono text-indigo-200"
                                    : ""
                                }`}
                              >
                                {r.user}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  isAiPerspective
                                    ? "text-indigo-500/60 font-mono"
                                    : "text-gray-400"
                                }`}
                              >
                                {r.date}
                              </div>
                            </div>
                            <StarRating rating={r.rating} />
                          </div>
                          <p
                            className={`mt-4 text-sm leading-relaxed ${
                              isAiPerspective
                                ? "text-indigo-200/90 font-mono"
                                : "text-gray-600"
                            }`}
                          >
                            {r.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`p-6 rounded-2xl border ${
                        isAiPerspective
                          ? "bg-slate-900 border-indigo-500/20 text-indigo-400/70 font-mono"
                          : "bg-white border-gray-100 text-gray-500"
                      }`}
                    >
                      暂无评价
                    </div>
                  )}
                </section>
              )}
            </div>

            <div className="lg:col-span-1">
              <div
                className={`p-6 rounded-2xl sticky top-24 border transition-all ${
                  isAiPerspective
                    ? "bg-slate-900 border-indigo-500/20"
                    : "bg-gray-50 border-transparent"
                }`}
              >
                <h3
                  className={`font-bold mb-4 ${
                    isAiPerspective
                      ? "text-indigo-300 font-mono"
                      : "text-gray-900"
                  }`}
                >
                  {isAiPerspective ? "SERVICE_PROTOCOLS" : "服务保障"}
                </h3>
                <ul className="space-y-4">
                  {[
                    { title: "正品保证", desc: "100% 官方正品，假一赔十" },
                    { title: "极速退款", desc: "确认退货后 24 小时内到账" },
                    { title: "七天无理由", desc: "支持 7 天无理由退换货" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <div
                        className={`p-1.5 rounded-lg shadow-sm mr-3 ${
                          isAiPerspective ? "bg-indigo-600/20" : "bg-white"
                        }`}
                      >
                        <svg
                          className={`w-4 h-4 ${
                            isAiPerspective
                              ? "text-indigo-400"
                              : "text-indigo-600"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold ${
                            isAiPerspective
                              ? "text-indigo-200"
                              : "text-gray-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`text-xs ${
                            isAiPerspective
                              ? "text-indigo-500/60"
                              : "text-gray-500"
                          }`}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [isAiPerspective, setIsAiPerspective] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, modelRes] = await Promise.all([
          fetch(`${API_BASE}/api/products`),
          fetch(`${API_BASE}/api/models`),
        ]);
        const prodData = await prodRes.json();
        const modelData = await modelRes.json();
        setProducts(dedupeProductsById(prodData));
        setModels(modelData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  const startGeneration = async (modelId: string, count: number) => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const allCopyTypes: GeoCopyType[] = [
      "definition",
      "problem",
      "comparison",
      "mechanism",
      "boundary",
    ];
    const safeCount = Math.max(1, Math.min(count, allCopyTypes.length));

    // 为每个商品独立随机选择 types
    const productCopyTypes: GeoCopyType[][] = products.map(() =>
      shuffle(allCopyTypes).slice(0, safeCount)
    );

    const totalTasks = products.length * safeCount;
    let completedTasks = 0;

    const results: any[][] = Array.from({ length: products.length }, () =>
      Array(safeCount).fill(null)
    );
    const tasks: Array<() => Promise<void>> = [];

    products.forEach((product, productIndex) => {
      const copyTypes = productCopyTypes[productIndex];
      copyTypes.forEach((type, typeIndex) => {
        tasks.push(async () => {
          try {
            const response = await fetch(`${API_BASE}/api/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: product.id,
                copyType: type,
                model: modelId,
              }),
            });
            const data = await response.json();

            if (data.content) {
              results[productIndex][typeIndex] = {
                productName: product.name,
                productType: product.category,
                coreFunctions: [type],
                targetAudience: [],
                unsuitableScenarios: [],
                keyConclusion: data.content,
              };
            }
          } catch (error) {
            console.error(
              `Failed to generate ${type} for ${product.id}:`,
              error
            );
          } finally {
            completedTasks++;
            setGenerationProgress(
              Math.floor((completedTasks / totalTasks) * 100)
            );
          }
        });
      });
    });

    const maxConcurrency = 6;
    let nextTaskIndex = 0;
    const workers = Array.from(
      { length: Math.min(maxConcurrency, tasks.length) },
      async () => {
        while (true) {
          const current = nextTaskIndex++;
          if (current >= tasks.length) break;
          await tasks[current]();
        }
      }
    );

    await Promise.all(workers);

    const updatedProducts = products.map((product, productIndex) => {
      const newGeoOptimized = results[productIndex].filter(Boolean);
      return {
        ...product,
        geoOptimized: (newGeoOptimized.length
          ? newGeoOptimized
          : product.geoOptimized) as any,
      };
    });

    setProducts(dedupeProductsById(updatedProducts));
    setIsGenerating(false);
    setIsAiPerspective(true);
  };

  return (
    <GeoContext.Provider
      value={{
        isAiPerspective,
        setIsAiPerspective,
        isGenerating,
        startGeneration,
        generationProgress,
        products,
        setProducts,
        models,
      }}
    >
      <Router basename={import.meta.env.VITE_BASE_PATH || "/"}>
        <div
          className={`min-h-screen font-sans transition-colors duration-500 ${
            isAiPerspective ? "bg-slate-950" : "bg-white"
          }`}
        >
          {/* Navigation Bar */}
          <nav
            className={`border-b sticky top-0 z-50 transition-all duration-500 ${
              isAiPerspective
                ? "bg-slate-950/80 backdrop-blur-md border-indigo-500/20"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link to="/" className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isAiPerspective
                        ? "bg-indigo-500 shadow-lg shadow-indigo-500/50"
                        : "bg-indigo-600"
                    }`}
                  >
                    <span className="text-white font-bold text-xl">G</span>
                  </div>
                  <span
                    className={`text-xl font-black tracking-tight transition-colors ${
                      isAiPerspective ? "text-white" : "text-gray-900"
                    }`}
                  >
                    GEO
                    <span
                      className={
                        isAiPerspective ? "text-indigo-400" : "text-indigo-600"
                      }
                    >
                      MALL
                    </span>
                  </span>
                </Link>

                <div className="hidden md:flex items-center space-x-8">
                  <Link
                    to="/"
                    className={`text-sm font-medium transition-colors ${
                      isAiPerspective
                        ? "text-indigo-300 hover:text-white"
                        : "text-gray-700 hover:text-indigo-600"
                    }`}
                  >
                    首页
                  </Link>
                  <a
                    href="#"
                    className={`text-sm font-medium transition-colors ${
                      isAiPerspective
                        ? "text-indigo-500/60 hover:text-indigo-300"
                        : "text-gray-500 hover:text-indigo-600"
                    }`}
                  >
                    新品
                  </a>
                  <a
                    href="#"
                    className={`text-sm font-medium transition-colors ${
                      isAiPerspective
                        ? "text-indigo-500/60 hover:text-indigo-300"
                        : "text-gray-500 hover:text-indigo-600"
                    }`}
                  >
                    限时特惠
                  </a>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    className={`p-2 transition-colors ${
                      isAiPerspective
                        ? "text-indigo-500/60 hover:text-indigo-300"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                  <button
                    className={`p-2 relative transition-colors ${
                      isAiPerspective
                        ? "text-indigo-500/60 hover:text-indigo-300"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                      2
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
            </Routes>
          </main>

          <footer
            className={`border-t py-12 mt-20 transition-colors duration-500 ${
              isAiPerspective
                ? "bg-slate-950 border-indigo-500/10"
                : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p
                className={`text-sm transition-colors ${
                  isAiPerspective
                    ? "text-indigo-500/40 font-mono"
                    : "text-gray-400"
                }`}
              >
                {isAiPerspective
                  ? "SYSTEM_LOG: GEO_MOCK_PLATFORM_V1.0.50_STABLE"
                  : "© 2025 GEOMALL 演示平台 - 模拟真实电商交互体验"}
              </p>
            </div>
          </footer>

          <GeoControlCenter />
        </div>
      </Router>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </GeoContext.Provider>
  );
};

export default App;
