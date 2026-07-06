import React, { useState, useContext } from "react";
import "./Navbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  IconLayoutDashboard,
  IconShoppingCart,
  IconReceipt,
  IconToolsKitchen2,
  IconBox,
  IconArmchair2,
  IconBuildingWarehouse,
  IconUsers,
  IconPhoto,
  IconReport,
  IconWallet,
  IconUserCircle,
  IconLogout,
  IconArrowsExchange
} from "@tabler/icons-react";
import { NavbarContext } from "../context/NavbarContext";
import LogoutConfirmModal from "./LogoutConfirmModal"; // path apne project ke hisaab se adjust karo

export const menuGroups = [
  {
    heading: "Workspace",
    items: [
      { title: "Dashboard", icon: <IconLayoutDashboard size={20} />, path: "/dashboard" },
      { title: "Orders", icon: <IconShoppingCart size={20} />, path: "/orders" },
      { title: "Billing", icon: <IconReceipt size={20} />, path: "/billing" },
      { title: "Menu", icon: <IconToolsKitchen2 size={20} />, path: "/menu" },
      { title: "Combos", icon: <IconBox size={20} />, path: "/combos" },
      { title: "Tables", icon: <IconArmchair2 size={20} />, path: "/tables" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { title: "Inventory", icon: <IconBuildingWarehouse size={20} />, path: "/inventory" },
      { title: "Staff", icon: <IconUsers size={20} />, path: "/staff" },
      { title: "Media", icon: <IconPhoto size={20} />, path: "/media" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { title: "Reports", icon: <IconReport size={20} />, path: "/reports" },
      { title: "Transactions", icon: <IconArrowsExchange  size={20} />, path: "/transactions" },
    ],
  },
  {
    heading: "Account",
    items: [
      { title: "Profile", icon: <IconUserCircle size={20} />, path: "/profile" },
      { title: "Logout", icon: <IconLogout size={20} />, action: "logout" },
    ],
  },
];

const Navbar = () => {
  const { isNavbarOpen } = useContext(NavbarContext);
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // 👇 Naya state — Logout click hone par seedha logout nahi,
  // pehle confirm modal khulega
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleItemClick = (item) => {
    if (item.action === "logout") {
      setShowLogoutConfirm(true);
      return;
    }
    navigate(item.path);
  };

  // Modal ke "Yes, Logout" button pe ye chalega
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${!isNavbarOpen ? "close" : ""}`}>
      <div className="logo">
        <div className="logo-box">{user?.name?.[0]}</div>
        <h2>{user?.name}</h2>
      </div>

      {menuGroups.map((group) => (
        <div className="menu-group" key={group.heading}>
          <h4>{group.heading}</h4>
          <ul>
            {group.items.map((item) => (
              <li
                key={item.title}
                className={location.pathname === item.path ? "active" : ""}
                onClick={() => handleItemClick(item)}
              >
                {item.icon}
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </aside>
  );
};

export default Navbar;