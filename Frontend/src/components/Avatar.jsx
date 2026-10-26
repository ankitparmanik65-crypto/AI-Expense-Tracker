const COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-orange-500",
];

export default function Avatar({ name = "", size = "md", className = "" }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  // Name se consistent color pick karo
  const colorIndex =
    (name || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    COLORS.length;

  const color = COLORS[colorIndex];

  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}