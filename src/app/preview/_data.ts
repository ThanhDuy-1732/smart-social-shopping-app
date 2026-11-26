export type DemoProduct = {
  id: string;
  name: string;
  price: number;
  shop: string;
  stock: number;
  note: string;
  category: string;
  tone: number;
};

export type DemoPost = {
  id: string;
  author: string;
  initial: string;
  when: string;
  used: string;
  title: string;
  text: string;
  topic: string;
  likes: number;
  comments: number;
  products: string[];
  tone: number;
};

export type DemoCategory = {
  id: string;
  name: string;
  count: number;
  tone: number;
};

export const products: DemoProduct[] = [
  {
    id: "noi-chien",
    name: "Nồi chiên không dầu 5 lít",
    price: 1490000,
    shop: "Bếp Nhà Mình",
    stock: 12,
    note: "5 lít · 1.500W · khay tháo rời",
    category: "Đồ bếp",
    tone: 1,
  },
  {
    id: "giay-chay",
    name: "Giày chạy bộ Lumen Air",
    price: 1290000,
    shop: "Chạy Bộ 365",
    stock: 4,
    note: "size 36–45 · đệm EVA hai lớp",
    category: "Chạy bộ",
    tone: 2,
  },
  {
    id: "den-ban",
    name: "Đèn bàn chống cận 12W",
    price: 420000,
    shop: "Góc Học Nhỏ",
    stock: 0,
    note: "3 mức sáng · chân đế 1,2 kg",
    category: "Góc học",
    tone: 3,
  },
  {
    id: "balo",
    name: "Balo laptop 15 inch",
    price: 690000,
    shop: "Đi Làm Mỗi Ngày",
    stock: 7,
    note: "ngăn đệm 15 inch · chống nước nhẹ",
    category: "Đi làm",
    tone: 4,
  },
  {
    id: "son-duong",
    name: "Son dưỡng dưỡng ẩm",
    price: 180000,
    shop: "Môi Mềm",
    stock: 30,
    note: "12 g · không bóng · không mùi cồn",
    category: "Chăm sóc",
    tone: 5,
  },
  {
    id: "may-xay",
    name: "Máy xay sinh tố 1,5 lít",
    price: 890000,
    shop: "Bếp Nhà Mình",
    stock: 3,
    note: "6 lưỡi inox · đế cao su",
    category: "Đồ bếp",
    tone: 6,
  },
];

export const posts: DemoPost[] = [
  {
    id: "post-1",
    author: "Mai Anh",
    initial: "MA",
    when: "2 giờ trước",
    used: "đã dùng 8 tháng",
    title: "Nồi chiên 5 lít vừa đủ cho bốn người, không phải canh từng mẻ",
    text: "Mình mua từ tháng 3, dùng gần như mỗi tối. Điều mình thích nhất không phải là chiên ít dầu, mà là giỏ đủ rộng để xếp một lớp khoai và một lớp ức gà cùng lúc. Khay dầu tháo ra rửa được trong máy, còn thân nồi thì chỉ cần lau.",
    topic: "bếp nhỏ",
    likes: 128,
    comments: 24,
    products: ["noi-chien"],
    tone: 1,
  },
  {
    id: "post-2",
    author: "Trung Hiếu",
    initial: "TH",
    when: "5 giờ trước",
    used: "đã chạy 300 km",
    title: "300 km với đôi này: đế vẫn êm, nhưng dây giày là điểm trừ",
    text: "Mình chạy 5 km, bốn buổi mỗi tuần. Sau 300 km, đế giữa chưa xẹp rõ rệt, phần upper vẫn ôm chân. Điểm trừ duy nhất là dây trơn, phải thắt hai lần mới chắc. Chân bè nên lên nửa số.",
    topic: "chạy bộ",
    likes: 96,
    comments: 31,
    products: ["giay-chay"],
    tone: 2,
  },
  {
    id: "post-3",
    author: "Linh Đan",
    initial: "LĐ",
    when: "hôm qua",
    used: "đã dùng 4 tháng",
    title: "Đổi đèn cho con, hết cảnh con kêu chói mắt",
    text: "Đèn cũ chói khi nhìn nghiêng. Mình chọn cây này vì tản sáng đều và có ba mức, mức thấp đủ để đọc truyện trước giờ ngủ. Chân đế nặng, con huých bàn cũng không đổ.",
    topic: "góc học",
    likes: 210,
    comments: 47,
    products: ["den-ban"],
    tone: 3,
  },
  {
    id: "post-4",
    author: "Bảo Ngọc",
    initial: "BN",
    when: "hôm qua",
    used: "đã dùng 1 năm",
    title: "Balo 15 inch mà vẫn gọn khi lên tàu điện",
    text: "Mình mang laptop 14 inch, sạc, áo mưa và hộp cơm. Ngăn laptop có đệm dày, lưng thoáng nên đeo 40 phút không nóng. Điểm trừ: quai xách hơi mảnh so với tổng trọng lượng.",
    topic: "đi làm",
    likes: 74,
    comments: 12,
    products: ["balo"],
    tone: 4,
  },
  {
    id: "post-5",
    author: "Hà My",
    initial: "HM",
    when: "2 ngày trước",
    used: "đã dùng 3 tháng",
    title: "Son dưỡng cho mùa hanh: đủ ẩm, không bóng dầu",
    text: "Mình cần một thỏi bỏ túi, thoa lại giữa ngày mà không cần gương. Chất sáp mềm, lên môi ráo chứ không bóng. Mùi nhẹ và bay sau vài phút nên không át mùi nước hoa.",
    topic: "chăm sóc",
    likes: 53,
    comments: 8,
    products: ["son-duong"],
    tone: 5,
  },
  {
    id: "post-6",
    author: "Quốc Việt",
    initial: "QV",
    when: "3 ngày trước",
    used: "đã dùng 6 tháng",
    title: "Xay sinh tố cho bốn người: 1,5 lít là vừa, đừng mua to hơn",
    text: "Cối 1,5 lít xay đủ bốn ly, thân máy chắc, không nhảy khi xay đá. Mình để ý nhất là phần đế cao su, sau sáu tháng vẫn chưa bong. Rửa hơi cồng kềnh vì cối cao.",
    topic: "bếp nhỏ",
    likes: 61,
    comments: 15,
    products: ["may-xay"],
    tone: 6,
  },
];

export const categories: DemoCategory[] = [
  { id: "bep", name: "Đồ bếp", count: 128, tone: 1 },
  { id: "chay", name: "Chạy bộ", count: 46, tone: 2 },
  { id: "hoc", name: "Góc học", count: 72, tone: 3 },
  { id: "lam", name: "Đi làm", count: 63, tone: 4 },
  { id: "soc", name: "Chăm sóc", count: 39, tone: 5 },
  { id: "dien", name: "Điện nhỏ", count: 54, tone: 6 },
];

export const topics = [
  { name: "bếp nhỏ", count: 128 },
  { name: "chạy bộ", count: 46 },
  { name: "góc học", count: 72 },
  { name: "đi làm", count: 63 },
  { name: "chăm sóc", count: 39 },
  { name: "điện nhỏ", count: 54 },
];

export const neighbours = [
  { name: "Thu Trang", initial: "TT", note: "đồ bếp · 48 bài" },
  { name: "Đức Huy", initial: "ĐH", note: "điện nhỏ · 26 bài" },
  { name: "Vân Khánh", initial: "VK", note: "chăm sóc · 31 bài" },
];

export const shops = [
  { id: "bep", name: "Bếp Nhà Mình", note: "34 món · trả lời trong 2 giờ" },
  { id: "chay", name: "Chạy Bộ 365", note: "18 món · đổi size 7 ngày" },
  { id: "goc", name: "Góc Học Nhỏ", note: "22 món · bảo hành 12 tháng" },
];

export const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

export const productById = (id: string) =>
  products.find((product) => product.id === id)!;

export const postsByProduct = (id: string) =>
  posts.filter((post) => post.products.includes(id));
