// Unified status color definitions - Dark, vibrant colors for clear distinction
export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-emerald-600 text-white border-emerald-700";
    case "received":
      return "bg-green-600 text-white border-green-700";
    case "confirmed":
      return "bg-blue-600 text-white border-blue-700";
    case "pending":
      return "bg-amber-500 text-white border-amber-600";
    case "cancelled":
      return "bg-red-600 text-white border-red-700";
    case "processing":
      return "bg-orange-600 text-white border-orange-700";
    case "shipped":
      return "bg-indigo-600 text-white border-indigo-700";
    default:
      return "bg-gray-600 text-white border-gray-700";
  }
};

export const getStatusColorClass = (status: string) => {
  return getStatusColor(status);
};
