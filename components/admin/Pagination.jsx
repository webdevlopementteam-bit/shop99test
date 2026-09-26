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
    <div className="flex items-center justify-end gap-2 bg-[#0B0F19] py-4 px-2">
      {/* Prev */}
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)} className="px-2 text-gray-400 hover:text-white disabled:opacity-30">
        ‹
      </button>

      {/* Pages */}
      {pages.map((p, index) =>
        p === "..." ? (
          <span key={index} className="text-gray-500 px-1">
            ...
          </span>
        ) : (
          <button
            key={index}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded-md text-sm transition ${
              page === p ? "bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] text-white shadow-md" : "text-gray-400 hover:bg-[#1F2937] hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="px-2 text-gray-400 hover:text-white disabled:opacity-30">
        ›
      </button>
    </div>
  );
}
