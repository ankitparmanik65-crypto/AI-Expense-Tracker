export default function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = false,
}) {
  const base =
    "px-4 py-2 rounded-lg font-semibold transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}