export const adminNavigation = [{href:"/admin/settlements",label:"Đối soát",permission:"finance.manage"},
  { href: "/admin/users", label: "Người dùng", permission: "users.manage" },
  { href: "/admin/shops", label: "Nhà bán", permission: "shops.review" },
  {
    href: "/admin/policies",
    label: "Chính sách",
    permission: "policies.manage",
  },
  {
    href: "/admin/categories",
    label: "Danh mục",
    permission: "catalog.manage",
  },
  {
    href: "/admin/products",
    label: "Sản phẩm",
    permission: "content.moderate",
  },
  { href: "/admin/jobs", label: "Tác vụ nền", permission: "users.manage" },
  {
    href: "/admin/payments",
    label: "Thanh toán",
    permission: "finance.manage",
  },
  {
    href: "/admin/disputes",
    label: "Khiếu nại",
    permission: "disputes.manage",
  },
  { href: "/admin/disputes", label: "Hoàn tiền", permission: "finance.manage" },
];
