export default function CategoryDropdown({ categories, onSelect }) {

  return (

    <select
      className="w-full bg-[#0B0F19] text-white border border-gray-700 p-3 rounded-lg outline-none"
      onChange={(e) => onSelect(e.target.value)}
    >

      <option value="" className="bg-[#111827] text-white">
        Select Category
      </option>

      {categories.map((cat) => (

        <option
          key={cat.id}
          value={cat.id}
          className="bg-[#111827] text-white"
        >
          {cat.name}
        </option>

      ))}

    </select>

  );
}
