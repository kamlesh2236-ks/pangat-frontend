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
  IconArrowsExchange,
  IconBuildingStore,
  IconCategory,
  IconChefHat,
  IconTruck,
  IconChevronDown,
} from "@tabler/icons-react";
import { NavbarContext } from "../context/NavbarContext";
import LogoutConfirmModal from "./LogoutConfirmModal";

export const menuGroups = [
  {
    heading: "Workspace",
    items: [
      { title: "Dashboard", icon: <IconLayoutDashboard size={20} />, path: "/dashboard" },
      { title: "Orders", icon: <IconShoppingCart size={20} />, path: "/orders" },
      { title: "Billing", icon: <IconReceipt size={20} />, path: "/billing" },
      {
        title: "Menu",
        icon: <IconToolsKitchen2 size={20} />,
        children: [
          { title: "All Items", icon: <IconChefHat size={18} />, path: "/menu" },
          { title: "Main Category", icon: <IconCategory size={18} />, path: "/main_category" },
          { title: "Combos", icon: <IconToolsKitchen2 size={18} />, path: "/combos" },
        ],
      },
      { title: "Tables", icon: <IconArmchair2 size={20} />, path: "/tables" },
      // {
      //   title: "S Dashboard",
      //   icon: <IconLayoutDashboard size={20} />,
      //   children: [
      //     { title: "Kitchen", icon: <IconChefHat size={18} />, path: "/kitchen" },
      //     { title: "Waiter", icon: <IconTruck size={18} />, path: "/waiter" },
      //   ]
      // }
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
      { title: "Transactions", icon: <IconArrowsExchange size={20} />, path: "/transactions" },
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

export const superAdminMenuGroups = [
  {
    heading: "Platform",
    items: [
      { title: "All Restaurants", icon: <IconBuildingStore size={20} />, path: "/super-admin/dashboard" },
    ],
  },
  {
    heading: "Account",
    items: [
      { title: "Logout", icon: <IconLogout size={20} />, action: "logout" },
    ],
  },
];


export const kitchenMenuGroups = [
  {
    heading: "Kitchen",
    items: [
      { title: "Order Queue", icon: <IconChefHat size={20} />, path: "/kitchen" },
    ],
  },
  {
    heading: "Account",
    items: [
      { title: "Logout", icon: <IconLogout size={20} />, action: "logout" },
    ],
  },
];

export const waiterMenuGroups = [
  {
    heading: "Waiter",
    items: [
      { title: "Ready Orders", icon: <IconTruck size={20} />, path: "/waiter" },
    ],
  },
  {
    heading: "Account",
    items: [
      { title: "Logout", icon: <IconLogout size={20} />, action: "logout" },
    ],
  },
];

const Navbar = () => {
  const { isNavbarOpen } = useContext(NavbarContext);
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === "SuperAdmin";
  const isKitchen = user?.role === "Kitchen";
  const isWaiter = user?.role === "Waiter";

  let activeMenuGroups = menuGroups;
  if (isSuperAdmin) activeMenuGroups = superAdminMenuGroups;
  else if (isKitchen) activeMenuGroups = kitchenMenuGroups;
  else if (isWaiter) activeMenuGroups = waiterMenuGroups;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Item-level submenu open/close (Menu -> All Items, Combos, etc.)
  const [openMenus, setOpenMenus] = useState({});
  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Group-level (Workspace, Operations...) open/close — default sab open
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(activeMenuGroups.map((g) => [g.heading, true]))
  );
  const toggleGroup = (heading) => {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  };

  const isChildActive = (item) =>
    item.children?.some((child) => location.pathname === child.path);

  // Group ke andar koi bhi item/child active hai kya (group ko highlight ke liye)
  const isGroupActive = (group) =>
    group.items.some(
      (item) => location.pathname === item.path || isChildActive(item)
    );

  const handleItemClick = (item) => {
    if (item.action === "logout") {
      setShowLogoutConfirm(true);
      return;
    }
    if (item.children) {
      toggleMenu(item.title);
      return;
    }
    navigate(item.path);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${!isNavbarOpen ? "close" : ""}`}>
      <div className="logo">
        <div className="logo-box">{user?.name?.[0]}</div>
        <h2 title={user?.name}>{user?.name}</h2>
      </div>

      {activeMenuGroups.map((group) => {
        const isOpen = openGroups[group.heading];
        return (
          <div className="menu-group" key={group.heading}>
            <h4
              className={isGroupActive(group) ? "group-active" : ""}
              onClick={() => toggleGroup(group.heading)}
            >
              <span>{group.heading}</span>
              <IconChevronDown
                size={14}
                className={`group-chevron ${isOpen ? "rotate" : ""}`}
              />
            </h4>

            <ul className={`group-items ${isOpen ? "open" : ""}`}>
              {group.items.map((item) => (
                <React.Fragment key={item.title}>
                  <li
                    className={
                      (location.pathname === item.path || isChildActive(item) ? "active " : "") +
                      (item.children ? "has-dropdown" : "")
                    }
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    {item.children && (
                      <IconChevronDown
                        size={16}
                        className={`chevron ${openMenus[item.title] ? "rotate" : ""}`}
                      />
                    )}
                  </li>

                  {item.children && (
                    <ul className={`submenu ${openMenus[item.title] ? "open" : ""}`}>
                      {item.children.map((child) => (
                        <li
                          key={child.title}
                          className={location.pathname === child.path ? "active" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(child.path);
                          }}
                        >
                          {child.icon}
                          <span>{child.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </React.Fragment>
              ))}
            </ul>
          </div>
        );
      })}

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