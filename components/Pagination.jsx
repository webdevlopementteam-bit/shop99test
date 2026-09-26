export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (i === page - 2 || i === page + 2) {
      pages.push("...");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-full bg-white px-3 py-2 shadow-sm">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold uppercase tracking-wide text-gray-600 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <span>‹</span>
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-1 sm:gap-2">
        {pages.map((p, index) =>
          p === "..." ? (
            <span key={index} className="px-1 text-sm font-bold text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={index}
              onClick={() => onPageChange(p)}
              className={`h-9 min-w-9 rounded-full px-3 text-sm font-bold transition ${
                page === p ? "bg-orange-500 text-white shadow-sm" : "text-gray-700 hover:bg-orange-50 hover:text-orange-500"
              }`}
            >
              {p}
            </button>
          ),
        )}
      </div>

      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold uppercase tracking-wide text-gray-600 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <span>›</span>
      </button>
    </div>
  );
}
