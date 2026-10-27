// โลโก้ LINE (กรอบเขียวมุมมน + กล่องข้อความ)
export const LINE_GREEN = "#06C755";

const LineLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" rx="11" fill={LINE_GREEN} />
    <path
      fill="#fff"
      d="M24 10.5c-8.6 0-15.5 5.6-15.5 12.5 0 6.2 5.5 11.4 12.9 12.4.5.1 1.2.3 1.4.8.2.4.1 1 .1 1.4l-.2 1.3c-.1.4-.3 1.5 1.3.8 1.6-.7 8.7-5.1 11.8-8.8 2.2-2.4 3.2-4.9 3.2-7.9 0-6.9-6.9-12.5-15-12.5Z"
    />
    <text x="24" y="26.6" textAnchor="middle" fontSize="7.6" fontWeight="800" fill={LINE_GREEN} fontFamily="Arial, sans-serif">
      LINE
    </text>
  </svg>
);

export default LineLogo;
