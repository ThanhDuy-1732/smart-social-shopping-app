import Link from "next/link";

const directions = [
  {
    dir: "a",
    letter: "Bản A",
    name: "Tạp chí",
    mini: "a-mini",
    cells: 3,
    intro:
      "Đọc như một tờ tạp chí sống: tiêu đề serif lớn, đường kẻ mảnh, ảnh đã phủ một màu xanh chàm. Bảng tin dẫn bằng một câu chuyện, phía sau là danh sách dài.",
    points: [
      "Bảng tin: bài dẫn lớn, rồi 4 bài dạng hàng có ảnh bên trái",
      "Trang tìm món: cột lọc dính bên trái, kết quả 2 cột",
      "Cảm giác: tin cậy, chậm, dành cho người đọc kỹ",
    ],
  },
  {
    dir: "b",
    letter: "Bản B",
    name: "Không gian",
    mini: "b-mini",
    cells: 3,
    intro:
      "Nền chuyển màu mềm, các khối kính mờ, thanh tìm kiếm nổi. Bảng tin chia thành bento: một bài lớn cạnh các ô chủ đề, người nên theo, món hôm nay.",
    points: [
      "Bảng tin: thanh lệnh dính trên cùng, hero bento, lưới 2 cột",
      "Trang tìm món: hero tìm kiếm, ô ngành hàng, lưới 3 cột",
      "Cảm giác: ứng dụng hiện đại, trẻ, nhiều chuyển động nhẹ",
    ],
  },
  {
    dir: "c",
    letter: "Bản C",
    name: "Nhãn & phiếu",
    mini: "c-mini",
    cells: 4,
    intro:
      "Mỗi bài là một tấm phiếu: viền đen dày, bóng cứng, nhãn dán hơi nghiêng, giá in bằng chữ đều. Trang tìm món dùng phiếu lọc và tem còn hàng.",
    points: [
      "Bảng tin: phiếu 2 cột, dòng giá kiểu hoá đơn, đường xé",
      "Trang tìm món: phiếu tìm, bảng lọc, tem dán trên ảnh",
      "Cảm giác: chợ, nhanh, rõ giá, hợp mua sắm",
    ],
  },
  {
    dir: "d",
    letter: "Bản D",
    name: "Quầy kính",
    mini: "d-mini",
    cells: 3,
    intro:
      "Bản kết hợp do bạn chọn: bề mặt kính và chuyển màu của B, nhưng giá, tồn kho, nhãn dán và nút bấm theo ngôn ngữ phiếu của C. Bài viết mềm, dữ liệu mua bán cứng.",
    points: [
      "Bảng tin: thanh kính, bài dẫn kèm phiếu giá, thẻ bài có dòng hoá đơn",
      "Trang tìm món: hero kính + phiếu ghi chú giấy, ô ngành hàng dán nhãn",
      "Cảm giác: ứng dụng hiện đại nhưng giá và tồn kho rõ như chợ",
    ],
  },
];

export default function PreviewHub() {
  return (
    <div className="pv pv-hub">
      <div className="pv-bg" aria-hidden="true" />
      <div className="pvh-wrap">
        <p className="pvh-label">Xem trước giao diện</p>
        <h1>Bốn hướng cho bảng tin và trang tìm món.</h1>
        <p className="pvh-lede">
          Dữ liệu là mẫu cố định để so sánh bố cục, nhịp chữ và cách đặt giá.
          Cả bốn bản giữ nguyên những gì trang hiện tại đang làm: tab bảng tin,
          tìm kiếm, bộ lọc ngành hàng, khoảng giá và tình trạng còn hàng. Bản D
          là bản ghép: kính của B, phiếu của C.
        </p>

        <div className="pvh-grid">
          {directions.map((direction) => (
            <article className="pvh-card" key={direction.dir}>
              <div className={`pvh-mini ${direction.mini}`} aria-hidden="true">
                {Array.from({ length: direction.cells }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
              <p className="pvh-letter">{direction.letter}</p>
              <h2>{direction.name}</h2>
              <p>{direction.intro}</p>
              <ul>
                {direction.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="pvh-links">
                <Link href={`/preview/${direction.dir}?view=feed`}>
                  Xem bảng tin
                </Link>
                <Link href={`/preview/${direction.dir}?view=search`}>
                  Xem tìm món
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="pvh-note">
          Ảnh trong các bản là khối màu tạm, sẽ thay bằng ảnh thật từ bài chia
          sẻ. Trang xem trước không được lập chỉ mục và không đổi giao diện
          /feed hay /search hiện tại. Thanh chuyển bản ở cuối màn hình giữ
          nguyên vị trí khi bạn đổi giữa các bản.
        </p>
      </div>
    </div>
  );
}
