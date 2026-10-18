/** Du lieu mau danh muc: 6 phong cach (menu cap 1) x 6 the loai dung chung (submenu giong het nhau) x cac loai cu the. */

export interface SeedStyle {
  slug: string; name: string; tagline: string; intro: string;
  palette: { name: string; hex: string }[]; signatureItems: string[]; keywords: string[];
}

export const SEED_STYLES: SeedStyle[] = [
  {
    slug: "y2k", name: "Y2K", tagline: "Hoài niệm năm 2000, bóng bẩy và tinh nghịch",
    intro: "Y2K gợi lại thập niên 2000 với dáng croptop ngắn, quần cạp trễ, chất liệu ánh kim và những phụ kiện nổi bật. Hợp với người yêu sự vui tươi, táo bạo và một chút hoài cổ.",
    palette: [{ name: "Hồng baby", hex: "#F4B6C8" }, { name: "Bạc ánh kim", hex: "#C9CED6" }, { name: "Xanh băng", hex: "#A9D4E8" }, { name: "Đen than", hex: "#1B1B1F" }, { name: "Trắng ngà", hex: "#F6F3EE" }],
    signatureItems: ["Túi kẹp nách", "Kính màu", "Quần cạp trễ", "Thắt lưng"],
    keywords: ["y2k", "nam 2000", "2000s", "millennium"],
  },
  {
    slug: "gloomy-coquette", name: "Gloomy Coquette", tagline: "Nữ tính u tối, lãng mạn như trang nhật ký đêm",
    intro: "Gloomy Coquette giữ sự ngọt ngào của coquette nhưng đổi sang gam tối: nơ đen, ren, ngọc trai và váy nhung. Dành cho những ai thích vẻ đẹp mong manh, hơi bí ẩn.",
    palette: [{ name: "Đen nhung", hex: "#14100F" }, { name: "Đỏ rượu", hex: "#5E1A27" }, { name: "Hồng khói", hex: "#B98A94" }, { name: "Trắng ngọc trai", hex: "#EDE6DC" }, { name: "Bạc cổ", hex: "#8E8A87" }],
    signatureItems: ["Nơ đen", "Ren", "Ngọc trai", "Váy tối màu"],
    keywords: ["gloomy", "coquette", "gloomy coquette", "goth nu tinh"],
  },
  {
    slug: "rococo", name: "Rococo", tagline: "Bay bổng, ngọt ngào như cung điện thế kỷ 18",
    intro: "Rococo là những tầng bèo, ren mỏng, tay phồng và gam pastel nhẹ như kem. Phong cách cho cô gái yêu sự lãng mạn cổ điển và các chi tiết thủ công tinh xảo.",
    palette: [{ name: "Hồng phấn", hex: "#E9C1C9" }, { name: "Xanh bạc hà", hex: "#BFD8CF" }, { name: "Kem sữa", hex: "#F3E8D6" }, { name: "Vàng nhạt", hex: "#D7B979" }, { name: "Lavender", hex: "#C9B9DC" }],
    signatureItems: ["Áo tay phồng", "Ren", "Nơ cổ", "Trang sức cổ điển"],
    keywords: ["rococo", "cung dinh", "royalcore"],
  },
  {
    slug: "baroque", name: "Baroque", tagline: "Lộng lẫy, kịch tính, mỗi chi tiết đều kể một câu chuyện",
    intro: "Baroque đậm chất cung đình: nhung, jacquard, họa tiết cầu kỳ và trang sức ánh kim. Chọn phong cách này khi bạn muốn bước vào phòng và để lại ấn tượng.",
    palette: [{ name: "Đỏ bordeaux", hex: "#5B1626" }, { name: "Vàng cổ", hex: "#B58E3F" }, { name: "Đen tuyền", hex: "#0F0C0A" }, { name: "Xanh hoàng gia", hex: "#1F2F5A" }, { name: "Kem", hex: "#EADFC8" }],
    signatureItems: ["Trang sức ánh kim", "Họa tiết cầu kỳ", "Phụ kiện nổi bật"],
    keywords: ["baroque", "ba rock", "cau ky"],
  },
  {
    slug: "maximalism", name: "Maximalism", tagline: "Nhiều màu, nhiều lớp, nhiều cá tính",
    intro: "Maximalism không sợ thừa: mix họa tiết, chồng màu, phụ kiện bản lớn. Càng táo bạo càng đúng tinh thần, miễn là bạn thấy vui khi mặc.",
    palette: [{ name: "Cam cháy", hex: "#E2672B" }, { name: "Hồng neon", hex: "#E8478F" }, { name: "Xanh cobalt", hex: "#2A55C9" }, { name: "Vàng mù tạt", hex: "#E0B22B" }, { name: "Xanh lá", hex: "#2F8F5B" }],
    signatureItems: ["Túi màu sắc", "Vòng cổ nhiều lớp", "Khuyên tai bản lớn"],
    keywords: ["maximalism", "maximalist", "mix mau"],
  },
  {
    slug: "morute", name: "Morute", tagline: "Dịu dàng, mềm mại như món đồ chơi nhồi bông",
    intro: "Morute pha giữa mori girl và cute: tông be sữa, caramel, len mềm và họa tiết gấu bông. Cảm giác ấm áp, thư thả, dễ mặc hằng ngày.",
    palette: [{ name: "Be sữa", hex: "#EBDDCB" }, { name: "Nâu caramel", hex: "#B9855A" }, { name: "Hồng đào", hex: "#F0C7B8" }, { name: "Xanh sương", hex: "#C8DAD3" }, { name: "Kem", hex: "#F7EFE3" }],
    signatureItems: ["Trang phục tông dịu", "Họa tiết gấu bông", "Phụ kiện mềm mại"],
    keywords: ["morute", "mori rute", "gau bong", "teddy"],
  },
];

export interface SeedType { slug: string; name: string; aliases: string[] }
export interface SeedCategory { slug: string; name: string; aliases: string[]; types: SeedType[] }

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: "quan-ao", name: "Quần áo", aliases: ["ao quan", "trang phuc", "do mac", "ao", "quan", "dam"],
    types: [
      { slug: "ao-croptop", name: "Áo croptop", aliases: ["crop top", "croptop", "ao crop"] },
      { slug: "baby-tee", name: "Baby tee", aliases: ["baby tee", "ao baby tee"] },
      { slug: "ao-so-mi", name: "Áo sơ mi", aliases: ["so mi", "ao so mi"] },
      { slug: "cardigan", name: "Áo cardigan", aliases: ["cardigan", "ao khoac len"] },
      { slug: "ao-blouse", name: "Áo blouse", aliases: ["blouse", "ao kieu", "ao tay phong"] },
      { slug: "ao-hai-day", name: "Áo hai dây", aliases: ["hai day", "ao 2 day", "camisole"] },
      { slug: "quan-cap-tre", name: "Quần cạp trễ", aliases: ["cap tre", "low rise", "low waist"] },
      { slug: "quan-ong-rong", name: "Quần ống rộng", aliases: ["ong rong", "wide leg"] },
      { slug: "quan-short", name: "Quần short", aliases: ["short", "quan dui", "quan ngan"] },
      { slug: "dam-babydoll", name: "Đầm babydoll", aliases: ["babydoll", "baby doll", "dam baby doll"] },
    ],
  },
  {
    slug: "chan-vay-va-vay-lien", name: "Chân váy & váy liền", aliases: ["chan vay", "vay lien", "vay", "vay dam"],
    types: [
      { slug: "chan-vay-mini", name: "Chân váy mini", aliases: ["vay mini", "chan vay ngan"] },
      { slug: "chan-vay-xep-ly", name: "Chân váy xếp ly", aliases: ["xep ly", "vay xep ly", "tennis skirt"] },
      { slug: "chan-vay-dai", name: "Chân váy dài", aliases: ["vay dai", "midi", "chan vay midi"] },
      { slug: "vay-corset", name: "Váy corset", aliases: ["corset", "dam corset"] },
      { slug: "vay-hai-day", name: "Váy hai dây", aliases: ["vay 2 day", "slip dress"] },
      { slug: "vay-maxi", name: "Váy maxi", aliases: ["maxi", "vay dai maxi"] },
    ],
  },
  {
    slug: "tui-xach", name: "Túi xách", aliases: ["tui", "bag", "handbag"],
    types: [
      { slug: "tui-kep-nach", name: "Túi kẹp nách", aliases: ["kep nach", "baguette", "tui baguette"] },
      { slug: "tui-deo-cheo", name: "Túi đeo chéo", aliases: ["deo cheo", "crossbody"] },
      { slug: "tui-tote", name: "Túi tote", aliases: ["tote"] },
      { slug: "tui-mini", name: "Túi mini", aliases: ["tui nho", "mini bag"] },
      { slug: "clutch", name: "Clutch", aliases: ["tui cam tay", "vi cam tay"] },
    ],
  },
  {
    slug: "phu-kien", name: "Phụ kiện", aliases: ["trang suc", "accessory", "accessories"],
    types: [
      { slug: "kinh-mau", name: "Kính màu", aliases: ["kinh mat", "kinh ram", "kinh", "sunglasses"] },
      { slug: "that-lung", name: "Thắt lưng", aliases: ["day nit", "belt", "day lung"] },
      { slug: "no-cai-toc", name: "Nơ cài tóc", aliases: ["no", "no toc", "kep toc"] },
      { slug: "vong-co", name: "Vòng cổ", aliases: ["day chuyen", "chuyen", "necklace", "choker"] },
      { slug: "khuyen-tai", name: "Khuyên tai", aliases: ["bong tai", "hoa tai", "earring"] },
      { slug: "gang-tay-ren", name: "Găng tay ren", aliases: ["gang tay", "gang ren"] },
      { slug: "mu-beret", name: "Mũ beret", aliases: ["beret", "non beret", "mu"] },
    ],
  },
  {
    slug: "giay-dep", name: "Giày dép", aliases: ["giay", "dep", "shoes"],
    types: [
      { slug: "giay-the-thao", name: "Giày thể thao", aliases: ["sneaker", "giay sneaker"] },
      { slug: "giay-bup-be", name: "Giày búp bê", aliases: ["bup be", "mary jane", "giay mary jane", "loafer"] },
      { slug: "boots", name: "Boots", aliases: ["bot", "giay bot"] },
      { slug: "sandal", name: "Sandal", aliases: ["dep quai", "xang dan"] },
      { slug: "giay-cao-got", name: "Giày cao gót", aliases: ["cao got", "giay got"] },
    ],
  },
  {
    slug: "set-do-hoan-chinh", name: "Set đồ hoàn chỉnh", aliases: ["set do", "set", "bo do", "outfit", "phoi do"],
    types: [
      { slug: "set-2-mon", name: "Set 2 món", aliases: ["set hai mon", "combo 2 mon"] },
      { slug: "set-3-mon", name: "Set 3 món", aliases: ["set ba mon", "combo 3 mon"] },
      { slug: "set-di-choi", name: "Set đồ dạo phố", aliases: ["set di choi", "do dao pho"] },
      { slug: "set-du-tiec", name: "Set dự tiệc", aliases: ["set du tiec", "do du tiec", "do di tiec"] },
    ],
  },
];
