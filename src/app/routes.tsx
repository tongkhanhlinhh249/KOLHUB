import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InfluencerList } from "./pages/InfluencerList";
import { ProfileDetails } from "./pages/ProfileDetails";
import { EmailSettings } from "./pages/EmailSettings";
import { Notifications } from "./pages/Notifications";
import { Help } from "./pages/Help";
import { Dashboard } from "./pages/Dashboard";
import { Search } from "./pages/Search";
import { Channels } from "./pages/Channels";
import { Saved } from "./pages/Saved";
import { ViolationList } from "./pages/ViolationList";
import { Account } from "./pages/Account";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, Component: Dashboard },
      { path: "search", Component: Search },
      { path: "influencers", Component: InfluencerList },
      { path: "channels", Component: Channels },
      { path: "violations", Component: ViolationList },
      { path: "saved", Component: Saved },
      { path: "account", Component: Account },
      { path: "profile", Component: ProfileDetails },
      { path: "email-settings", Component: EmailSettings },
      { path: "notifications", Component: Notifications },
      { path: "help", Component: Help },
    ],
  },
]);