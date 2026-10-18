/** [loai cu the, ten, gia (nghin dong), mau, gia goc (nghin dong, tuy chon)] */
export type SeedRow = [type: string, name: string, priceK: number, colors: string, origK?: number];

export const SEED_PRODUCTS: Record<string, Record<string, SeedRow[]>> = {
  y2k: {
    "quan-ao": [
      ["ao-croptop", "Áo croptop ôm viền nhũ bạc", 179, "hong,bac"],
      ["baby-tee", "Baby tee in chữ Y2K", 159, "trang,hong", 199],
      ["quan-cap-tre", "Quần jean cạp trễ ống loe", 389, "xanh"],
      ["dam-babydoll", "Đầm babydoll nơ ngực Y2K", 329, "hong,trang", 399],
    ],
    "chan-vay-va-vay-lien": [
      ["chan-vay-mini", "Chân váy mini xếp ly caro", 219, "den,do"],
      ["chan-vay-xep-ly", "Chân váy tennis xếp ly trắng", 199, "trang"],
      ["vay-hai-day", "Váy hai dây satin ánh kim", 349, "bac,hong"],
    ],
    "tui-xach": [
      ["tui-kep-nach", "Túi kẹp nách da bóng hồng baby", 259, "hong"],
      ["tui-mini", "Túi mini đính charm ngôi sao", 199, "bac"],
      ["tui-deo-cheo", "Túi đeo chéo nylon phản quang", 229, "den,bac"],
    ],
    "phu-kien": [
      ["kinh-mau", "Kính mắt tròn tráng gương màu", 129, "hong,tim"],
      ["that-lung", "Thắt lưng xích kim loại", 149, "bac"],
      ["no-cai-toc", "Set kẹp tóc bướm nhựa 6 chiếc", 69, "hong,xanh"],
    ],
    "giay-dep": [
      ["giay-the-thao", "Sneaker đế dày trắng bạc", 489, "trang,bac", 590],
      ["giay-bup-be", "Giày búp bê mũi tròn hồng", 289, "hong"],
      ["sandal", "Sandal quai đính đá", 259, "bac"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set croptop + quần cạp trễ", 459, "den,hong"],
      ["set-3-mon", "Set áo khoác lửng, croptop, chân váy", 749, "bac,tim", 890],
      ["set-di-choi", "Set đồ dạo phố Y2K", 399, "hong"],
    ],
  },
  "gloomy-coquette": {
    "quan-ao": [
      ["ao-blouse", "Áo blouse cổ nơ đen viền ren", 289, "den"],
      ["ao-hai-day", "Áo hai dây ren đen", 169, "den"],
      ["cardigan", "Cardigan len mỏng cài nơ", 329, "den,do"],
      ["dam-babydoll", "Đầm babydoll ren đen tay phồng", 399, "den", 479],
    ],
    "chan-vay-va-vay-lien": [
      ["vay-corset", "Váy corset nhung đỏ rượu", 549, "do,den"],
      ["chan-vay-dai", "Chân váy dài xếp tầng ren", 359, "den"],
      ["vay-hai-day", "Váy slip lụa đen viền ren", 429, "den"],
    ],
    "tui-xach": [
      ["tui-mini", "Túi mini nhung đen nơ ngọc trai", 289, "den"],
      ["tui-kep-nach", "Túi kẹp nách da đen khóa bạc", 319, "den"],
      ["clutch", "Clutch nhung đính ngọc trai", 259, "den,do"],
    ],
    "phu-kien": [
      ["vong-co", "Choker nhung đen mặt ngọc trai", 99, "den"],
      ["no-cai-toc", "Nơ cài tóc lụa đen", 59, "den"],
      ["gang-tay-ren", "Găng tay ren đen dài", 129, "den"],
      ["khuyen-tai", "Khuyên tai ngọc trai dáng giọt", 119, "trang,bac"],
    ],
    "giay-dep": [
      ["giay-bup-be", "Mary Jane đen quai ngang", 349, "den"],
      ["boots", "Boots cổ thấp đế bằng", 599, "den"],
      ["giay-cao-got", "Giày cao gót nhung mũi nhọn", 489, "do,den"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set áo ren + chân váy tối màu", 569, "den"],
      ["set-3-mon", "Set váy + cardigan + choker", 799, "den,do", 950],
      ["set-du-tiec", "Set dự tiệc gothic dịu", 899, "den,do"],
    ],
  },
  rococo: {
    "quan-ao": [
      ["ao-blouse", "Áo blouse tay phồng thêu hoa", 329, "kem,hong"],
      ["ao-so-mi", "Sơ mi cổ nơ voan mỏng", 299, "trang,kem"],
      ["cardigan", "Cardigan len thêu hoa nhí", 349, "hong,kem"],
      ["dam-babydoll", "Đầm babydoll bèo nhún ngọt ngào", 399, "hong,kem", 460],
    ],
    "chan-vay-va-vay-lien": [
      ["chan-vay-xep-ly", "Chân váy xếp ly pastel", 259, "hong,xanh"],
      ["vay-maxi", "Váy maxi cổ vuông bồng", 589, "kem"],
      ["vay-corset", "Váy corset phối ren hồng phấn", 519, "hong"],
    ],
    "tui-xach": [
      ["tui-tote", "Túi tote thêu hoa", 249, "kem"],
      ["tui-mini", "Túi mini hình trái tim ngọc trai", 279, "hong,trang"],
      ["tui-deo-cheo", "Túi đeo chéo da hồng pastel", 299, "hong"],
    ],
    "phu-kien": [
      ["vong-co", "Vòng cổ ngọc trai cổ điển", 139, "trang,vang"],
      ["khuyen-tai", "Khuyên tai cameo mạ vàng", 159, "vang"],
      ["no-cai-toc", "Nơ cài tóc ren pastel", 69, "hong,kem"],
      ["gang-tay-ren", "Găng tay ren cổ điển", 119, "kem"],
    ],
    "giay-dep": [
      ["giay-bup-be", "Búp bê mũi tròn ruy băng", 329, "hong,kem"],
      ["sandal", "Sandal quai ngọc trai", 289, "kem"],
      ["giay-cao-got", "Cao gót gót thấp dáng cổ điển", 449, "kem,vang"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set sơ mi nơ + chân váy xếp ly", 549, "kem,hong"],
      ["set-3-mon", "Set váy + cardigan + nơ tóc", 699, "hong"],
      ["set-du-tiec", "Set dự tiệc pastel hoàng gia", 990, "hong,vang", 1190],
    ],
  },
  baroque: {
    "quan-ao": [
      ["ao-blouse", "Áo blouse jacquard cầu kỳ", 459, "den,vang"],
      ["ao-so-mi", "Sơ mi lụa in họa tiết cung đình", 389, "do,vang"],
      ["cardigan", "Áo khoác dệt vàng cổ điển", 689, "vang,den"],
      ["quan-ong-rong", "Quần ống rộng nhung bordeaux", 459, "do"],
    ],
    "chan-vay-va-vay-lien": [
      ["chan-vay-dai", "Chân váy dài thêu chỉ vàng", 529, "den,vang"],
      ["vay-corset", "Váy corset in họa tiết baroque", 649, "do,vang"],
      ["vay-maxi", "Váy maxi nhung xanh hoàng gia", 790, "xanh"],
    ],
    "tui-xach": [
      ["tui-mini", "Túi mini khóa mạ vàng", 369, "den,vang"],
      ["clutch", "Clutch thêu kim tuyến", 429, "vang"],
      ["tui-deo-cheo", "Túi đeo chéo da dập họa tiết", 449, "do"],
    ],
    "phu-kien": [
      ["vong-co", "Vòng cổ mạ vàng đính đá", 249, "vang"],
      ["khuyen-tai", "Khuyên tai bản lớn ánh kim", 189, "vang"],
      ["that-lung", "Thắt lưng bản to khóa chạm", 279, "vang,den"],
      ["mu-beret", "Mũ beret nhung đính trâm", 199, "do"],
    ],
    "giay-dep": [
      ["boots", "Boots da dập vân cổ điển", 790, "den"],
      ["giay-cao-got", "Cao gót gót vàng mũi nhọn", 649, "den,vang"],
      ["giay-bup-be", "Loafer nhung thêu chỉ vàng", 490, "xanh"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set áo jacquard + chân váy dài", 790, "den,vang"],
      ["set-3-mon", "Set vest + sơ mi + quần nhung", 1190, "do", 1390],
      ["set-du-tiec", "Set dạ tiệc ánh kim", 1290, "vang,den"],
    ],
  },
  maximalism: {
    "quan-ao": [
      ["ao-so-mi", "Sơ mi in hoa nhiều màu", 329, "nhieu-mau"],
      ["quan-ong-rong", "Quần ống rộng họa tiết sọc màu", 369, "nhieu-mau", 429],
      ["cardigan", "Cardigan dệt patchwork", 459, "nhieu-mau"],
      ["ao-croptop", "Áo croptop phối màu tương phản", 219, "vang,hong"],
    ],
    "chan-vay-va-vay-lien": [
      ["chan-vay-mini", "Chân váy mini chấm bi phối màu", 259, "do,vang"],
      ["chan-vay-dai", "Chân váy dài in hoa lớn", 399, "nhieu-mau"],
      ["vay-maxi", "Váy maxi họa tiết lạ mắt", 599, "xanh,vang"],
    ],
    "tui-xach": [
      ["tui-tote", "Túi tote màu neon", 279, "hong,vang"],
      ["tui-mini", "Túi mini hình hoa 3D", 249, "nhieu-mau"],
      ["tui-deo-cheo", "Túi đeo chéo khối màu", 299, "xanh,do"],
    ],
    "phu-kien": [
      ["vong-co", "Vòng cổ nhiều lớp hạt màu", 169, "nhieu-mau"],
      ["khuyen-tai", "Khuyên tai bản lớn hình hoa", 129, "hong,vang"],
      ["kinh-mau", "Kính mắt gọng vuông màu cam", 149, "vang,hong"],
      ["mu-beret", "Mũ beret họa tiết", 179, "nhieu-mau"],
    ],
    "giay-dep": [
      ["giay-the-thao", "Sneaker phối màu khối", 590, "nhieu-mau"],
      ["sandal", "Sandal đế bánh mì màu kẹo", 349, "hong,xanh"],
      ["boots", "Boots da bóng màu cobalt", 790, "xanh"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set áo + chân váy cùng họa tiết", 529, "nhieu-mau"],
      ["set-3-mon", "Set blazer + áo + quần phối màu", 899, "vang,hong", 1090],
      ["set-di-choi", "Set dạo phố mix màu", 449, "nhieu-mau"],
    ],
  },
  morute: {
    "quan-ao": [
      ["baby-tee", "Áo baby tee thêu gấu", 169, "kem,be"],
      ["cardigan", "Cardigan len lông mềm", 359, "be,hong"],
      ["ao-so-mi", "Sơ mi cotton cổ tròn", 249, "trang,kem"],
      ["dam-babydoll", "Đầm babydoll caro dịu", 329, "be,hong"],
    ],
    "chan-vay-va-vay-lien": [
      ["chan-vay-xep-ly", "Chân váy xếp ly be sữa", 239, "be"],
      ["vay-maxi", "Váy maxi len mỏng", 459, "kem"],
      ["chan-vay-mini", "Chân váy mini tông đào", 219, "hong"],
    ],
    "tui-xach": [
      ["tui-tote", "Túi tote vải thêu gấu", 199, "kem,nau"],
      ["tui-mini", "Túi mini hình gấu bông", 269, "nau,be"],
      ["tui-deo-cheo", "Túi đeo chéo da mềm tông be", 289, "be"],
    ],
    "phu-kien": [
      ["no-cai-toc", "Kẹp tóc gấu bông", 49, "nau,hong"],
      ["mu-beret", "Mũ beret len mềm", 159, "be,kem"],
      ["vong-co", "Vòng cổ charm gấu", 99, "vang"],
      ["gang-tay-ren", "Găng tay len hở ngón", 79, "kem"],
    ],
    "giay-dep": [
      ["giay-bup-be", "Búp bê da lộn be", 319, "be"],
      ["giay-the-thao", "Sneaker trắng kem", 429, "kem,trang"],
      ["boots", "Boots lông ngắn", 549, "nau,be"],
    ],
    "set-do-hoan-chinh": [
      ["set-2-mon", "Set cardigan + chân váy xếp ly", 559, "be,kem"],
      ["set-3-mon", "Set áo len + váy + mũ beret", 649, "be,hong", 770],
      ["set-di-choi", "Set đồ dạo phố tông dịu", 429, "kem,be"],
    ],
  },
};

export const STYLE_MATERIALS: Record<string, string[]> = {
  y2k: ["Satin ánh kim", "Cotton co giãn", "Denim mềm", "Nylon phản quang"],
  "gloomy-coquette": ["Nhung mịn", "Ren Pháp", "Voan lụa", "Satin đen"],
  rococo: ["Voan tơ", "Ren thêu", "Cotton thêu hoa", "Len mỏng"],
  baroque: ["Jacquard", "Nhung", "Lụa tơ tằm", "Da dập vân"],
  maximalism: ["Cotton in hoa", "Sợi dệt nhiều màu", "Da bóng", "Vải patchwork"],
  morute: ["Len mềm", "Cotton organic", "Lông ngắn", "Da lộn"],
};
