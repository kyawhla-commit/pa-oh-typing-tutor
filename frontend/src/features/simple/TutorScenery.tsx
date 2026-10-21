/** Decorative scenery is separate from the readable, interactive lesson surface. */
export default function TutorScenery({ decorative = false }: { decorative?: boolean }) {
  return <div className="tutor-scenery" aria-hidden="true">
    <div className="scenery-landscape" /><div className="scenery-portrait" /><div className="scenery-night" />
    {decorative && <svg className="scenery-ribbons" viewBox="0 0 1280 360" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ribbon-green" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#176253" /><stop offset="1" stopColor="#053c36" /></linearGradient>
        <linearGradient id="ribbon-gold"><stop stopColor="#e1b65e" /><stop offset=".5" stopColor="#ffedb7" /><stop offset="1" stopColor="#c89a3d" /></linearGradient>
        <pattern id="woven-diamonds" width="48" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><path d="M24 4 40 22 24 40 8 22Z M24 12 33 22 24 32 15 22Z" fill="none" stroke="#cba451" strokeWidth="1.5" /><path d="M24 18 28 22 24 26 20 22Z" fill="#cba451" /></pattern>
      </defs>
      <path d="M0 0C45 65 108 25 167 80S273 221 447 203 697 173 835 209 1058 233 1148 154 1234 95 1280 80V360H0Z" fill="url(#ribbon-green)" stroke="#679678" />
      <path d="M0 37C112 75 104 130 221 161S392 246 560 215 790 218 949 233 1132 151 1280 104V153C1155 193 1119 274 967 267S701 232 560 246 326 264 212 205 98 118 0 61Z" fill="#f4e8c6" />
      <path d="M0 61C98 118 98 153 212 205S419 260 560 246 822 252 967 267 1155 193 1280 153V176C1155 216 1122 294 965 287S699 254 560 264 326 282 211 226 98 142 0 83Z" fill="url(#ribbon-gold)" />
      <path d="M920 333 1280 197V273L1050 360H920Z" fill="url(#woven-diamonds)" />
      <path d="m943 331 337-123m-283 152 283-104" stroke="#cba451" fill="none" opacity=".7" />
      <g fill="none" stroke="#d4af62" strokeWidth="1.2">
        <path d="M6 350C59 286 62 223 42 151M24 326C73 273 101 253 109 215M40 292C17 271 5 237 6 217M54 255C72 232 80 195 73 174" />
        <path d="M44 275C12 262 5 243 6 225 30 234 39 251 44 275ZM56 246C63 219 86 206 105 210 87 228 77 237 56 246ZM54 216C28 200 21 183 25 170 45 181 52 191 54 216ZM36 312C67 287 87 290 112 295 85 308 64 315 36 312ZM24 327C14 302 13 287 1 278" />
      </g>
      {[{ x: 40, y: 151 }, { x: 72, y: 174 }, { x: 108, y: 212 }, { x: 25, y: 169 }].map(({ x, y }) => <g key={x} transform={`translate(${x} ${y})`} fill="#e7be6b">{[0, 60, 120, 180, 240, 300].map(angle => <ellipse key={angle} cy="-6" rx="2.7" ry="5" transform={`rotate(${angle})`} />)}<circle r="2.5" fill="#fff0b9" /></g>)}
    </svg>}
  </div>;
}
